package au.org.ala.fieldcapture.green_army;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
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
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import au.org.ala.fieldcapture.green_army.data.FieldCaptureContent;
import au.org.ala.fieldcapture.green_army.service.Mapper;

/**
 * Displays the appropriate data entry form for an activity in a WebView and handles callbacks.
 */
public class EnterActivityData extends Fragment implements LoaderManager.LoaderCallbacks<Cursor> {

    private static final int NEW_SITE_REQUEST = 1;

    public static class MobileBindings {

        private Fragment fragment;
        private Activity ctx;
        private String activityId;
        private String activityToLoad;
        private String sitesToLoad;
        private ContentValues newSite;
        private Bundle savedState;
        private String themesToLoad;

        public MobileBindings(Fragment fragment, String activityId, String activityToLoad, String sitesToLoad, ContentValues newSite, String themesToLoad) {
            this.ctx = fragment.getActivity();
            this.fragment = fragment;
            this.activityId = activityId;
            this.activityToLoad = activityToLoad;
            this.sitesToLoad = sitesToLoad;
            this.newSite = newSite;
            this.themesToLoad = themesToLoad;

        }
        @JavascriptInterface
        public String loadActivity() {

            Log.d("Enter activity data", "load activity");
            return activityToLoad;
        }

        @JavascriptInterface
        public String loadSites() {
            return sitesToLoad;
        }

        @JavascriptInterface
        public String loadThemes() { return themesToLoad;}

        @JavascriptInterface
        public void createNewSite() {
            Intent siteIntent = new Intent(ctx, SiteActivity.class);
            fragment.startActivityForResult(siteIntent, NEW_SITE_REQUEST);
        }

        @JavascriptInterface
        public boolean supportsNewSite() {
            return true;
        }

        @JavascriptInterface
        public void onSaveActivity(int status, String activityData) {
            Log.d("Enter activity data", "save activity, status: "+status+", activity: "+activityData);

            if (savedState != null) {
                savedState.putString("activity", activityData);
            }
            else {
                if (status < 0) {
                    Toast.makeText(ctx, R.string.activity_not_modified, Toast.LENGTH_LONG).show();
                }
                else if (status > 0) {
                    try {
                        JSONObject activity = new JSONObject(activityData);


                        ContentValues values = Mapper.mapActivity(activity);
                        values.put(FieldCaptureContent.SYNC_STATUS, FieldCaptureContent.SYNC_STATUS_NEEDS_UPDATE);

                        Uri uri = FieldCaptureContent.activityUri(activityId);

                        ctx.getContentResolver().update(uri, values, FieldCaptureContent.ACTIVITY_ID + "=?", new String[]{activityId});

                        if (newSite != null) {
                            ctx.getContentResolver().insert(FieldCaptureContent.siteUri(newSite.getAsString(FieldCaptureContent.SITE_ID)), newSite);

                        }

                        FieldCaptureContent.requestSync(ctx, true);

                        ctx.finish();
                    } catch (Exception e) {
                        Log.e("EnterActivityData", "Failed to save activity: " + activityData, e);
                    }
                }
                else {
                    Toast.makeText(ctx, R.string.activity_validation_failed, Toast.LENGTH_LONG).show();
                }
            }
        }

        public void newSite(ContentValues newSite) {
            this.newSite = newSite;
        }

        public void saveState(Bundle bundle) {
            this.savedState = bundle;
        }
    }

    /**
     * The fragment argument representing the item ID that this fragment
     * represents.
     */
    public static final String ARG_ACTIVITY_ID = "activityId";

    /** Identifies the loader we are using */
    private static final int ACTIVITY_LOADER_ID = 1;
    private static final int SITES_LOADER_ID = 2;

    private EnterActivityDataActivity parent;

    private WebView webView;
    private String activityId;
    private String activity;
    private String sites;
    private String activityUrl;
    private String themes;
    private ContentValues siteToSave;

    private MobileBindings mobileBindings;

    @Override
    public Loader<Cursor> onCreateLoader(int id, Bundle args) {

        switch (id) {
            case ACTIVITY_LOADER_ID:
                String activityId = args.getString(ARG_ACTIVITY_ID);
                Uri activityUri = FieldCaptureContent.activityUri(activityId);
                return new CursorLoader(getActivity(), activityUri, null, FieldCaptureContent.ACTIVITY_ID+"=?", new String[] {activityId}, null);
            case SITES_LOADER_ID:
                Uri sitesUri = FieldCaptureContent.sitesUri();
                return new CursorLoader(getActivity(), sitesUri, null, null, null, null);
            default:
                return null;
        }

    }

    @Override
    public void onLoadFinished(Loader<Cursor> loader, Cursor data) {

        try {
            switch (loader.getId()) {
                case ACTIVITY_LOADER_ID:

                    activityToJSON(data);
                    tryLoadPage();
                    break;
                case SITES_LOADER_ID:
                    siteToJSON(data);
                    tryLoadPage();
                    break;
            }
        }
        finally {
            data.close();
        }

    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == NEW_SITE_REQUEST) {
            if (resultCode == Activity.RESULT_OK) {
                ContentValues site = data.getParcelableExtra(SiteActivity.SITE_KEY);
                if (site != null) {
                    site.put(FieldCaptureContent.SYNC_STATUS, FieldCaptureContent.SYNC_STATUS_NEEDS_UPDATE);
                    try {
                        JSONObject activityJSON = new JSONObject(activity);
                        site.put(FieldCaptureContent.PROJECT_ID, activityJSON.getString(FieldCaptureContent.PROJECT_ID));
                        siteToSave = site;
                        mobileBindings.newSite(siteToSave);
                        JSONObject newSite = Mapper.mapSite(site);
                        mWebView.loadUrl("javascript:master.addSite("+newSite.toString()+")");
                    }
                    catch (JSONException e) {
                        Log.e("EnterActivityData", "Unable to create new site", e);
                    }
                }
            }
        }

    }

    /** TODO this should be on background thread */
    private void siteToJSON(Cursor data) {
        List<JSONObject> sites = new ArrayList<JSONObject>(data.getCount());

        try {
            boolean result = data.moveToFirst();
            while (result) {

                sites.add(Mapper.mapSite(data));

                result = data.moveToNext();
            }
            this.sites = sites.toString();
        }
        catch (JSONException e) {
            this.sites = "[]";
            Log.e("EnterActivityData", "Error loading sites", e);
        }
        finally {
            if (data != null) {
                data.close();
            }
        }

    }

    private void activityToJSON(Cursor data) {
        boolean hasResult = data.moveToFirst();
        if (hasResult) {
            try {
                JSONObject activity = Mapper.mapActivity(data);

                String type = activity.getString("type");
                type = type.replaceAll(" ", "_"); // Some android versions don't seem to be able to load even encoded spaces in URLs
                activityUrl = "file:///android_asset/" + type + ".html";
                this.activity = activity.toString();
                this.themes = activity.getString("themes").toString();

            } catch (Exception e) {
                Log.e("EnterActivityData", "Unable to load activity: " + data, e);
            }
            finally {
                data.close();
            }
        } else {
            // Display error?
        }
    }

    private void tryLoadPage() {
        if (activityUrl != null && sites != null) {
            Log.i("EnterActivityData", "Loading page with sites="+sites);

            mobileBindings = new MobileBindings(this, activityId, activity, sites, siteToSave, themes);
            getWebView().addJavascriptInterface(mobileBindings, "mobileBindings");
            getWebView().loadUrl(activityUrl);
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

        webView = getWebView();
        if(android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.JELLY_BEAN) {
            webView.getSettings().setAllowUniversalAccessFromFileURLs(true);
        }
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {

                return super.shouldOverrideUrlLoading(view, url);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                Log.d("EnterActivityData", "Url: "+url);

                return super.shouldInterceptRequest(view, url);
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                parent.hideProgressBar();
            }
        });
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setSupportMultipleWindows(true);
        webView.setWebChromeClient(new WebChromeClient() {
            public boolean onConsoleMessage(ConsoleMessage cm) {
                Log.d("EnterActivityData", cm.message() + " -- From line "
                        + cm.lineNumber() + " of "
                        + cm.sourceId() );
                return true;
            }
            @Override
            public boolean onCreateWindow(WebView view, boolean dialog, boolean userGesture, Message resultMsg) {
                WebView.HitTestResult result = view.getHitTestResult();
                String data = result.getExtra();
                Context context = view.getContext();
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(data));
                context.startActivity(browserIntent);
                return false;
            }
        });

        if (savedInstanceState == null) {
            Bundle args = new Bundle();
            args.putString(ARG_ACTIVITY_ID, activityId);
            getLoaderManager().initLoader(ACTIVITY_LOADER_ID, args, this);
            getLoaderManager().initLoader(SITES_LOADER_ID, null, this);
        }
        else {
            activityId = savedInstanceState.getString(ARG_ACTIVITY_ID);
            activity = savedInstanceState.getString("activity");
            sites = savedInstanceState.getString("sites");
            activityUrl = savedInstanceState.getString("activityUrl");
            siteToSave = savedInstanceState.getParcelable("newSite");
            themes = savedInstanceState.getString("themes");

            tryLoadPage();
        }
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


    public void onSaveInstanceState(Bundle savedInstanceState) {
        super.onSaveInstanceState(savedInstanceState);

        mobileBindings.saveState(savedInstanceState);
        savedInstanceState.putString("activity", activity);
        triggerSave();
        savedInstanceState.putString(ARG_ACTIVITY_ID, activityId);
        savedInstanceState.putString("sites", sites);
        savedInstanceState.putString("activityUrl", activityUrl);
        savedInstanceState.putParcelable("newSite", siteToSave);
        savedInstanceState.putString("themes", themes);

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
        if (mobileBindings != null) {
            mobileBindings.saveState(null);
        }
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

    @Override
    public void onAttach(Activity parent) {
        super.onAttach(parent);
        this.parent = (EnterActivityDataActivity)parent;
    }


    /**
     * Gets the WebView.
     */
    public WebView getWebView() {
        return mIsWebViewAvailable ? mWebView : null;
    }


}
