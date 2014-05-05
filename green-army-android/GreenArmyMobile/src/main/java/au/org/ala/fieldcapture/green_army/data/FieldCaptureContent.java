package au.org.ala.fieldcapture.green_army.data;

import android.accounts.Account;
import android.content.ContentResolver;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

import au.org.ala.fieldcapture.green_army.data.sync.FieldCaptureSyncAdapter;

/**
 * Contract class for the FieldCaptureContentProvider.
 */
public final class FieldCaptureContent {

    public static final String AUTHORITY = "au.org.ala.fieldcapture";

    public static final String ACCOUNT_TYPE = "au.org.ala";

    public static final String PROJECTS = "projects";

    public static final String ACTIVITIES = "activities";

    public static final String SITES = "sites";




    public static final String SYNC_STATUS = "syncStatus";
    public static final String SYNC_STATUS_UP_TO_DATE = "synced";
    public static final String SYNC_STATUS_NEEDS_UPDATE = "unsynced";


    public static final String PROJECTS_URI = "content://"+AUTHORITY+"/"+PROJECTS;
    public static final String PROJECT_ACTIVITIES_URI = "content://"+AUTHORITY+"/"+PROJECTS+"/*/"+ACTIVITIES;
    public static final String ACTIVITY_URI = "content://"+AUTHORITY+"/"+ACTIVITIES+"/*";
    public static final String ACTIVITIES_URI = "content://"+AUTHORITY+"/"+ACTIVITIES;
    public static final String DELETE_URI = "content://"+AUTHORITY+"/"+PROJECTS;
    public static final String SITES_URI = "content://"+AUTHORITY+"/"+SITES;
    public static final String SITE_URI = "content://"+AUTHORITY+"/"+SITES+"/*";
    public static final String PROJECT_SITES_URI = "content://"+AUTHORITY+"/"+PROJECTS+"/*/"+SITES;


    /** Column name / JSON attribute name for the id used by an activity */
    public static final String ACTIVITY_ID = "activityId";

    /** Column name / JSON attribute name for the id used by a project */
    public static final String PROJECT_ID = "projectId";
    public static final String STATUS_CHANGED = "updated";

    public static final String[] PROJECT_COLUMNS = new String[]
            {"projectId",
            "name",
            "description",
            "grantId",
            "externalId",
            "plannedStartDate",
            "plannedEndDate",
            "organisationName",
            "lastUpdated"};

    public static final String[] ACTIVITY_COLUMNS = new String[] {
            "activityId",
            "projectId",
            "type",
            "description",
            "projectStage",
            "progress",
            "lastUpdated",
            "outputs",
            "syncStatus",
            "plannedStartDate",
            "plannedEndDate",
            "startDate",
            "endDate"
    };

    public static final String[] SITE_COLUMNS = new String[] {
            "siteId",
            "name",
            "description",
            "lat",
            "lon"
    };
    public static final String SITE_ID = "siteId";

    public static Uri activityUri(String activityId) {
        String uri = ACTIVITY_URI.replace("*", activityId);
        return Uri.parse(uri);
    }

    public static Uri allActivitiesUri() {
        return Uri.parse(ACTIVITIES_URI);
    }

    public static Uri allProjectsUri() {
        return Uri.parse(PROJECTS_URI);
    }

    public static Uri projectActivitiesUri(String projectId) {
        return Uri.parse(PROJECT_ACTIVITIES_URI.replace("*", projectId));
    }

    public static Uri sitesUri() {
        return Uri.parse(SITES_URI);
    }

    public static Uri siteUri(String siteId) {
        return Uri.parse(SITE_URI.replace("*", siteId));
    }

    public static Uri projectSitesUri(String projectId) {
        return Uri.parse(PROJECT_SITES_URI.replace("*", projectId));
    }

    public static Uri deleteUri() {
        return Uri.parse(DELETE_URI);
    }


    public static void requestSync(Context ctx) {
        FieldCaptureContent.requestSync(ctx, false);
    }

    public static void requestSync(Context ctx, boolean forceSync) {
        PreferenceStorage storage = PreferenceStorage.getInstance(ctx);

        // This method can be triggered on logout as the delete operation will trigger a refresh of the
        // project list cursor.
        String username = storage.getUsername();
        if (username != null) {

            Bundle params = new Bundle();
            params.putBoolean(FieldCaptureSyncAdapter.FORCE_REFRESH_ARG, forceSync);

            ContentResolver.requestSync(
                    new Account(username, FieldCaptureContent.ACCOUNT_TYPE), FieldCaptureContent.AUTHORITY, params);
        }
        else {
            Log.i("FieldCaptureContent", "Ignoring sync request for logged out user");
        }
    }


    public static Uri projectSitesUri() {
        return null;
    }
}
