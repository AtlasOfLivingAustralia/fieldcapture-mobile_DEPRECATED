package au.org.ala.fieldcapture.green_army.data.sync;

import android.accounts.Account;
import android.content.AbstractThreadedSyncAdapter;
import android.content.ContentProviderClient;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
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
        ecodataInterface =  EcodataInterface.getInstance(context);
        mContentResolver = context.getContentResolver();
    }

    public FieldCaptureSyncAdapter(
            Context context,
            boolean autoInitialize,
            boolean allowParallelSyncs) {
        super(context, autoInitialize, allowParallelSyncs);

        ecodataInterface = EcodataInterface.getInstance(context);
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



        PreferenceStorage storage = PreferenceStorage.getInstance(getContext());
        if (storage.getUsername() != null) {
            boolean forceRefresh = extras.getBoolean(FORCE_REFRESH_ARG, false);

            Intent intent = new Intent(FieldCaptureContent.ACTION_SYNC_STARTED);
            getContext().sendBroadcast(intent);
            performUpdates();
            performQueries(forceRefresh);

            intent = new Intent(FieldCaptureContent.ACTION_SYNC_COMPLETE);
            getContext().sendBroadcast(intent);

            Log.i("FieldCaptureSyncAdapter", "sync complete");
        }
        else {
            Log.i("FieldCaptureSyncAdapter", "Ignoring sync for logged out user");
        }


    }

    private void performQueries(boolean forceRefresh) {


        Cursor existingActivities = null;
        try {
            boolean refresh = forceRefresh;
            if (!refresh) {
                existingActivities = mContentResolver.query(FieldCaptureContent.allActivitiesUri(), null, null, null, null);
                refresh = existingActivities.getCount() == 0;
            }
            if (refresh) {

                Log.i("FieldCaptureSyncAdapter", "Checking for updates...");
                Uri projectsUri = FieldCaptureContent.allProjectsUri();
                List<JSONObject> projects = ecodataInterface.getProjectsForUser();

                if (projects != null) {
                    try {
                        mContentResolver.bulkInsert(projectsUri, Mapper.mapProjects(projects));

                        for (JSONObject project : projects) {
                            String projectId = project.getString(FieldCaptureContent.PROJECT_ID);
                            JSONObject projectDetails = ecodataInterface.getProjectDetails(projectId);
                            JSONArray activities = projectDetails.getJSONArray("activities");

                            if (activities != null && activities.length() > 0) {
                                Uri activitiesUri = FieldCaptureContent.projectActivitiesUri(projectId);
                                mContentResolver.bulkInsert(activitiesUri, Mapper.mapActivities(activities));
                            }

                            JSONArray sites = projectDetails.getJSONArray("sites");
                            if (sites != null && sites.length() > 0) {
                                Uri sitesUri = FieldCaptureContent.sitesUri();
                                mContentResolver.bulkInsert(sitesUri, Mapper.mapSites(sites));

                                Uri projectSitesUri = FieldCaptureContent.projectSitesUri(projectId);
                                mContentResolver.bulkInsert(projectSitesUri, Mapper.mapProjectSites(projectId, sites));
                            }


                        }
                    } catch (JSONException e) {
                        Log.e("FieldCaptureContentProvider", "Error retrieving projects from server", e);
                    }
                }

            }
        }
        finally {
            if (existingActivities != null) {
                existingActivities.close();
            }
        }
    }

    private void performUpdates() {

        if (saveSites()) {
            saveActivities();
        }
    }

    private boolean saveSites() {
        // Mapping from client assigned site id to server assigned site id.
        Map<String, String> siteIdMap =  new HashMap<String, String>();
        Cursor sites = mContentResolver.query(FieldCaptureContent.sitesUri(), null, FieldCaptureContent.SYNC_STATUS+"=?", new String[]{FieldCaptureContent.SYNC_STATUS_NEEDS_UPDATE}, null);
        int numSites = sites.getCount();
        try {
            while (sites.moveToNext()) {

                String id = sites.getString(sites.getColumnIndex(FieldCaptureContent.SITE_ID));
                boolean success = false;
                try {
                    JSONObject json = Mapper.mapSiteForUpload(sites);

                    EcodataInterface.SaveSiteResult result = ecodataInterface.saveSite(json);
                    if (result.success) {
                        siteIdMap.put(id, result.siteId);
                    }
                } catch (JSONException e) {
                    Log.e("FieldCaptureSyncAdapter", "Unable to save to to invalid JSON", e);
                }
                Log.i("FieldCaptureSyncAdapter", "Update: " + id + ", result=" + success);

            }

            for (String id : siteIdMap.keySet()) {

                ContentValues values = new ContentValues();
                // Replace the site id and mark as synced.
                values.put(FieldCaptureContent.SITE_ID, siteIdMap.get(id));
                values.put(FieldCaptureContent.SYNC_STATUS, FieldCaptureContent.SYNC_STATUS_UP_TO_DATE);

                // Update the site
                mContentResolver.update(FieldCaptureContent.siteUri(id), values, FieldCaptureContent.SITE_ID + "=?", new String[]{id});

                // Update any activities that refer to that site.
                values.remove(FieldCaptureContent.SYNC_STATUS);
                mContentResolver.update(FieldCaptureContent.allActivitiesUri(),values,  FieldCaptureContent.SITE_ID+"=?", new String[]{id});
            }

        }
        finally {
            if (sites != null) {
                sites.close();
            }
        }
        return numSites == siteIdMap.size();
    }

    private void saveActivities() {
        Map<String, Boolean> results =  new HashMap<String, Boolean>();
        Cursor activities = mContentResolver.query(FieldCaptureContent.allActivitiesUri(), null, "a."+FieldCaptureContent.SYNC_STATUS+"=?", new String[]{FieldCaptureContent.SYNC_STATUS_NEEDS_UPDATE}, null);
        try {
            while (activities.moveToNext()) {

                String id = activities.getString(activities.getColumnIndex(FieldCaptureContent.ACTIVITY_ID));
                boolean success = false;
                try {
                    JSONObject json = Mapper.mapActivityForUpload(activities);

                    success = ecodataInterface.saveActivity(json);
                } catch (JSONException e) {
                    Log.e("FieldCaptureSyncAdapter", "Unable to save to to invalid JSON", e);
                }
                Log.i("FieldCaptureSyncAdapter", "Update: " + id + ", result=" + success);
                results.put(id, success);
            }

            for (String id : results.keySet()) {

                if (results.get(id)) {
                    ContentValues values = new ContentValues();
                    values.put(FieldCaptureContent.ACTIVITY_ID, id);
                    values.put(FieldCaptureContent.SYNC_STATUS, FieldCaptureContent.SYNC_STATUS_UP_TO_DATE);

                    mContentResolver.update(FieldCaptureContent.activityUri(id), values, FieldCaptureContent.ACTIVITY_ID + "=?", new String[]{id});
                }
            }
        }
        finally {
            if (activities != null) {
                activities.close();
            }
        }
    }


}
