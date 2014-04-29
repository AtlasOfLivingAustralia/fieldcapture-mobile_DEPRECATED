package au.org.ala.fieldcapture.green_army;

import android.accounts.Account;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.app.LoaderManager;
import android.support.v4.content.CursorLoader;
import android.support.v4.content.Loader;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.util.StringUtils;

import au.org.ala.fieldcapture.green_army.data.PreferenceStorage;
import au.org.ala.fieldcapture.green_army.data.FieldCaptureContent;
import au.org.ala.fieldcapture.green_army.service.Mapper;

/**
 * Displays the appropriate data entry form for an activity in a WebView and handles callbacks.
 */
public class EnterActivityData extends Fragment implements LoaderManager.LoaderCallbacks<Cursor> {

    public static class MobileBindings {

        private Context ctx;
        private String activityId;
        private String activityToLoad;

        public MobileBindings(Context ctx, String activityId, String activityToLoad) {
            this.ctx = ctx;
            this.activityId = activityId;
            this.activityToLoad = activityToLoad;

        }
        @JavascriptInterface
        public String loadActivity() {

            Log.d("Enter activity data", "load activity");
            return activityToLoad;
        }

        @JavascriptInterface
        public void saveActivity(String activityData) {
            Log.d("Enter activity data", "save activity: "+activityData);

            try {
                JSONObject activity = new JSONObject(activityData);


                ContentValues values = Mapper.mapActivity(activity);
                values.put(FieldCaptureContent.SYNC_STATUS, FieldCaptureContent.SYNC_STATUS_NEEDS_UPDATE);

                Uri uri = FieldCaptureContent.activityUri(activityId);

                ctx.getContentResolver().update(uri, values, FieldCaptureContent.ACTIVITY_ID + "=?", new String[]{activityId});


                Account account = new Account(PreferenceStorage.getInstance(ctx).getUsername(), FieldCaptureContent.ACCOUNT_TYPE);
                ctx.getContentResolver().requestSync(account, FieldCaptureContent.AUTHORITY, new Bundle());

                ((Activity)ctx).finish();
            }
            catch (Exception e){
                Log.e("EnterActivityData", "Failed to save activity: "+activityData, e);
            }
        }
    }

    /**
     * The fragment argument representing the item ID that this fragment
     * represents.
     */
    public static final String ARG_ACTIVITY_ID = "activityId";

    /** Identifies the loader we are using */
    private static final int ACTIVITY_LOADER_ID = 1;

    private WebView webView;
    private String activityId;

    @Override
    public Loader<Cursor> onCreateLoader(int id, Bundle args) {

        String activityId = args.getString(ARG_ACTIVITY_ID);
        switch (id) {
            case ACTIVITY_LOADER_ID:
                Uri activityUri = FieldCaptureContent.activityUri(activityId);
                return new CursorLoader(getActivity(), activityUri, null, FieldCaptureContent.ACTIVITY_ID+"=?", new String[] {activityId}, null);
            default:
                return null;
        }

    }

    @Override
    public void onLoadFinished(Loader<Cursor> loader, Cursor data) {

        //String url = EcodataInterface.FIELDCAPTURE_URL + "/activity/enterData/"+activityId+"?mobile=mobile";

        boolean hasResult = data.moveToFirst();
        if (hasResult) {
            try {
                JSONObject activity = Mapper.toJSONObject(data, null);

                String savedAsString = activity.optString("outputs");
                if (StringUtils.hasLength(savedAsString)) {

                    JSONArray outputs = new JSONArray(savedAsString);
                    if (outputs != null) {
                        activity.put("outputs", outputs);
                    }
                }
                String type = activity.getString("type");
                type = type.replaceAll(" ", "_"); // Some android versions don't seem to be able to load even encoded spaces in URLs
                String url = "file:///android_asset/"+type+".html";
                getWebView().addJavascriptInterface(new MobileBindings(getActivity(), activityId, activity.toString()), "mobileBindings");
                getWebView().loadUrl(url);
            }
            catch (Exception e) {
                Log.e("EnterActivityData", "Unable to load activity: "+data, e);
            }
        }
        else {
            // Display error?
        }

    }

    @Override
    public void onLoaderReset(Loader<Cursor> loader) {

    }


    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setHasOptionsMenu(true);
        if (getArguments().containsKey(ARG_ACTIVITY_ID)) {
            activityId = getArguments().getString(ARG_ACTIVITY_ID);
        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        if (mWebView != null) {
            mWebView.destroy();
        }
        mWebView = new WebView(getActivity());
        mIsWebViewAvailable = true;

        if (savedInstanceState != null) {
            activityId = savedInstanceState.getString(ARG_ACTIVITY_ID);
        }

        webView = getWebView();
        webView.setWebViewClient(new WebViewClient());
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webView.setWebChromeClient(new WebChromeClient() {
            public boolean onConsoleMessage(ConsoleMessage cm) {
                Log.d("EnterActivityData", cm.message() + " -- From line "
                        + cm.lineNumber() + " of "
                        + cm.sourceId() );
                return true;
            }
        });

        Bundle args = new Bundle();
        args.putString(ARG_ACTIVITY_ID, activityId);
        getLoaderManager().initLoader(ACTIVITY_LOADER_ID, args, this);

        return mWebView;
    }


    @Override
    public void onCreateOptionsMenu(Menu menu, MenuInflater inflater) {
        // Inflate the menu items for use in the action bar
        inflater.inflate(R.menu.enter_data_actions, menu);
        super.onCreateOptionsMenu(menu, inflater);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle presses on the action bar items
        switch (item.getItemId()) {
            case R.id.action_save:
                triggerSave();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    private void triggerSave() {

        // This will result in a callback onto our mobileBindings interface that will do
        // the actual save.
        webView.loadUrl("javascript:master.save()");
    }


    private WebView mWebView;
    private boolean mIsWebViewAvailable;


    /**
     * Called when the fragment is visible to the user and actively running. Resumes the WebView.
     */
    @Override
    public void onPause() {
        super.onPause();
        mWebView.onPause();
    }

    /**
     * Called when the fragment is no longer resumed. Pauses the WebView.
     */
    @Override
    public void onResume() {
        mWebView.onResume();
        super.onResume();
    }

    /**
     * Called when the WebView has been detached from the fragment.
     * The WebView is no longer available after this time.
     */
    @Override
    public void onDestroyView() {
        mIsWebViewAvailable = false;
        super.onDestroyView();
    }

    /**
     * Called when the fragment is no longer in use. Destroys the internal state of the WebView.
     */
    @Override
    public void onDestroy() {
        if (mWebView != null) {
            mWebView.destroy();
            mWebView = null;
        }
        super.onDestroy();
    }

    /**
     * Gets the WebView.
     */
    public WebView getWebView() {
        return mIsWebViewAvailable ? mWebView : null;
    }


}
