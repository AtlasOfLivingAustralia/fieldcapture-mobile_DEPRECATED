package au.org.ala.fieldcapture.green_army;


import android.accounts.Account;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.content.SyncStatusObserver;
import android.database.Cursor;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.app.LoaderManager;
import android.support.v4.content.CursorLoader;
import android.support.v4.content.Loader;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import au.org.ala.fieldcapture.green_army.data.FieldCaptureContent;
import au.org.ala.fieldcapture.green_army.data.PreferenceStorage;


/**
 * A simple {@link Fragment} subclass.
 * Use the {@link StatusFragment#newInstance} factory method to
 * create an instance of this fragment.
 *
 */
public class StatusFragment extends Fragment implements SyncStatusObserver,  LoaderManager.LoaderCallbacks<Cursor> {

    private static final int SYNC_STATUS_LOADER = 100;

    private Account account;
    private Object syncObserver;

    private Status currentStatus;
    private StatusCallback statusCallback;

    /**
     * A callback interface that all activities containing this fragment must
     * implement. This mechanism allows activities to be notified of status changes.
     */
    public interface StatusCallback {
        /**
         * Callback for when an item has been selected.
         */
        public void onStatusChanged(Status status);
    }

    public static boolean isNetworkAvaialble(Context ctx) {
        ConnectivityManager cm =
                (ConnectivityManager)ctx.getSystemService(Context.CONNECTIVITY_SERVICE);

        NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
        return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
    }

    /**
     * Tracks a bunch of status variables.
     */
    public static class Status {

        public boolean syncInProgress;
        public boolean syncPending;
        public String lastSyncTime;
        public boolean syncFailure;
        public boolean networkActive;
    }

    public static StatusFragment newInstance() {
        StatusFragment fragment = new StatusFragment();
        Bundle args = new Bundle();

        fragment.setArguments(args);
        return fragment;
    }
    public StatusFragment() {
        // Required empty public constructor
    }

    @Override
    public Loader<Cursor> onCreateLoader(int id, Bundle args) {
        if (id == SYNC_STATUS_LOADER) {
            return new CursorLoader(getActivity(), FieldCaptureContent.syncStatusUri(), null, null, null, null);
        }
        return null;
    }

    @Override
    public void onLoadFinished(Loader<Cursor> loader, Cursor data) {
        if (data.moveToFirst()) {

            currentStatus.syncInProgress = (data.getInt(data.getColumnIndex("currentStatus")) == FieldCaptureContent.SYNC_IN_PROGRESS);
            currentStatus.syncFailure = (!currentStatus.syncInProgress && data.getInt(data.getColumnIndex("lastSyncResult")) == FieldCaptureContent.SYNC_FAILED);
            //currentStatus.syncPending = !currentStatus.syncInProgress && ContentResolver.isSyncPending(account, FieldCaptureContent.AUTHORITY);

            notifyCallback();
        }
    }

    @Override
    public void onLoaderReset(Loader<Cursor> loader) {

    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        currentStatus = new Status();
        account = PreferenceStorage.getInstance(getActivity()).getAccount();


        getLoaderManager().initLoader(SYNC_STATUS_LOADER, new Bundle(), this);

    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        return null;
    }

    @Override
    public void onAttach(Activity activity) {
        super.onAttach(activity);

        // Activities containing this fragment must implement its callbacks.
        if (!(activity instanceof StatusCallback)) {
            throw new IllegalStateException("Activity must implement fragment's callbacks.");
        }

        statusCallback = (StatusCallback) activity;
    }

    @Override
    public void onDetach() {
        super.onDetach();

        // Reset the active callbacks interface to the dummy implementation.
        statusCallback = null;
    }


    @Override
    public void onStatusChanged(int which) {
        Log.i("ActivityListFragment", "Sync notification: " + which);
        getActivity().runOnUiThread(new Runnable() { public void run() {
            updateSyncStatus();
        }});

    }

    @Override
    public void onPause() {
        super.onPause();
        if (syncObserver != null) {
            ContentResolver.removeStatusChangeListener(syncObserver);
        }
        Log.d("ProjectActivitiesFragment", "onPause");
    }

    @Override
    public void onResume() {
        super.onResume();
        syncObserver = ContentResolver.addStatusChangeListener(0x7fffffff, this);
        updateSyncStatus();
        Log.d("ProjectActivitiesFragment", "onResume");
    }



    private void updateSyncStatus() {
        //currentStatus.syncPending = ContentResolver.isSyncPending(account, FieldCaptureContent.AUTHORITY);

        notifyCallback();
    }


    private void notifyCallback() {
        if (statusCallback != null) {
            statusCallback.onStatusChanged(currentStatus);
        }
    }
}
