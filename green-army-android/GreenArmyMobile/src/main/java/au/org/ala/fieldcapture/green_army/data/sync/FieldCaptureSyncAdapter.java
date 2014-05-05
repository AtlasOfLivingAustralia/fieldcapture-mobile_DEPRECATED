package au.org.ala.fieldcapture.green_army.data.sync;

import android.accounts.Account;
import android.content.AbstractThreadedSyncAdapter;
import android.content.ContentProviderClient;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.SyncResult;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

import au.org.ala.fieldcapture.green_army.data.PreferenceStorage;
import au.org.ala.fieldcapture.green_army.data.FieldCaptureContent;
import au.org.ala.fieldcapture.green_army.data.EcodataInterface;
import au.org.ala.fieldcapture.green_army.service.Mapper;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FieldCaptureSyncAdapter extends AbstractThreadedSyncAdapter {

    public static final String FORCE_REFRESH_ARG = "ForceRefresh";
    ContentResolver mContentResolver;
    EcodataInterface ecodataInterface;

    public FieldCaptureSyncAdapter(Context context, boolean autoInitialise) {
        super(context, autoInitialise);
        ecodataInterface = new EcodataInterface(context);
        mContentResolver = context.getContentResolver();
    }

    public FieldCaptureSyncAdapter(
            Context context,
            boolean autoInitialize,
            boolean allowParallelSyncs) {
        super(context, autoInitialize, allowParallelSyncs);

        ecodataInterface = new EcodataInterface(context);
        mContentResolver = context.getContentResolver();
    }

    @Override
    public void onPerformSync(
            Account account,
            Bundle extras,
            String authority,
            ContentProviderClient provider,
            SyncResult syncResult) {

        Log.i("FieldCaptureSyncAdapter", "sync called");


        boolean forceRefresh = extras.getBoolean(FORCE_REFRESH_ARG, false);
        performUpdates();
        performQueries(forceRefresh);

        Log.i("FieldCaptureSyncAdapter", "sync complete");


    }

    private void performQueries(boolean forceRefresh) {


        boolean refresh = forceRefresh;
        if (!refresh) {
            Cursor activites = mContentResolver.query(FieldCaptureContent.allActivitiesUri(), null, null, null, null);
            refresh = activites.getCount() == 0;
        }
        if (refresh) {

            Log.i("FieldCaptureSyncAdapter", "Checking for updates...");
            Uri projectsUri = FieldCaptureContent.allProjectsUri();
            List<JSONObject> projects = ecodataInterface.getProjectsForUser();

            try {
                mContentResolver.bulkInsert(projectsUri, Mapper.mapProjects(projects));

                for (JSONObject project : projects) {
                    String projectId = project.getString(FieldCaptureContent.PROJECT_ID);
                    JSONArray activities = ecodataInterface.getProjectActivities(projectId);

                    if (activities != null && activities.length() > 0) {
                        Uri activitiesUri = FieldCaptureContent.projectActivitiesUri(projectId);
                        mContentResolver.bulkInsert(activitiesUri, Mapper.mapActivities(activities));
                    }
                }
            }
            catch (JSONException e) {
                Log.e("FieldCaptureContentProvider", "Error retrieving projects from server", e);
            }

        }
    }

    private void performUpdates() {

        Map<String, Boolean> results =  new HashMap<String, Boolean>();
        Cursor activities = mContentResolver.query(FieldCaptureContent.allActivitiesUri(), null, FieldCaptureContent.SYNC_STATUS+"=?", new String[]{FieldCaptureContent.SYNC_STATUS_NEEDS_UPDATE}, null);
        while (activities.moveToNext()) {


            String id = activities.getString(activities.getColumnIndex(FieldCaptureContent.ACTIVITY_ID));
            boolean success = false;
            try {
                JSONObject json = Mapper.toJSONObject(activities, null);
                String outputData = json.optString("outputs");
                if (outputData != null) {
                    json.remove("outputs");
                    json.put("outputs", new JSONArray(outputData));
                }
                success = ecodataInterface.saveActivity(json);
            }
            catch (JSONException e) {
                Log.e("FieldCaptureSyncAdapter", "Unable to save to to invalid JSON", e);
            }
            Log.i("FieldCaptureSyncAdapter", "Update: "+id+", result="+success);
            results.put(id, success);
        }

        for (String id:results.keySet()) {

            if (results.get(id)) {
                ContentValues values = new ContentValues();
                values.put(FieldCaptureContent.ACTIVITY_ID, id);
                values.put(FieldCaptureContent.SYNC_STATUS, FieldCaptureContent.SYNC_STATUS_UP_TO_DATE);

                mContentResolver.update(FieldCaptureContent.activityUri(id), values, FieldCaptureContent.ACTIVITY_ID+"=?", new String[]{id});
            }
        }
    }


}
