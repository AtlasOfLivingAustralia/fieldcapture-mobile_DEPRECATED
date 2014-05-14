package au.org.ala.fieldcapture.green_army.service;

import android.content.ContentValues;
import android.database.Cursor;
import android.util.Log;

import au.org.ala.fieldcapture.green_army.data.FieldCaptureContent;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

/**
 * Performs mappings between JSONObjects and ContentValues.
 */
public class Mapper {

    public static ContentValues[] mapProjects(List<JSONObject> projects) throws JSONException {

        ContentValues[] allValues = new ContentValues[projects.size()];
        for (int i=0; i<projects.size(); i++) {
            allValues[i] = mapProject(projects.get(i));

        }
        return allValues;
    }


    public static ContentValues mapProject(JSONObject project) throws JSONException {
        return toContentValues(project, FieldCaptureContent.PROJECT_COLUMNS);
    }

    public static ContentValues[] mapActivities(JSONArray activities) throws JSONException {

        List<ContentValues> allValues = new ArrayList<ContentValues>(activities.length());
        for (int i=0; i<activities.length(); i++) {
            if (!activities.isNull(i)) {
                allValues.add(mapActivity(activities.getJSONObject(i)));
            }
        }
        return allValues.toArray(new ContentValues[allValues.size()]);
    }


    public static ContentValues mapActivity(JSONObject activity) throws JSONException {
        if (Log.isLoggable("Mapper", Log.DEBUG)) {
            Log.d("Mapper", "Mapping activity from JSON: "+activity.toString(2));
        }
        return toContentValues(activity, FieldCaptureContent.ACTIVITY_COLUMNS);
    }


    public static JSONObject mapActivity(Cursor cursor) throws JSONException {

        JSONObject activity = toJSONObject(cursor, FieldCaptureContent.ACTIVITY_FLAT_COLUMNS);

        // Special case of JSON encoded arrays and nested objects.
        String encodedThemes = cursor.getString(cursor.getColumnIndex("themes"));
        if (StringUtils.hasLength(encodedThemes)) {
            activity.put("themes", new JSONArray(encodedThemes));
        }
        else {
            activity.put("themes", new JSONArray());
        }

        String encodedOutputs = cursor.getString(cursor.getColumnIndex("outputs"));
        if (StringUtils.hasLength(encodedThemes)) {
            activity.put("outputs", new JSONArray(encodedOutputs));
        }
        else {
            activity.put("outputs", new JSONArray());
        }

        return activity;
    }

    public static JSONObject toJSONObject(Cursor cursor, String[] columns) throws JSONException {
        if (columns == null) {
            columns = cursor.getColumnNames();
        }
        JSONObject result = new JSONObject();
        for (String column :columns) {
            int index = cursor.getColumnIndex(column);
            int type = cursor.getType(index);
            switch (type) {
                case Cursor.FIELD_TYPE_INTEGER:
                    result.put(column, cursor.getInt(index));
                    break;
                case Cursor.FIELD_TYPE_FLOAT:
                    result.put(column, cursor.getDouble(index));
                    break;
                case Cursor.FIELD_TYPE_STRING:
                    result.put(column, cursor.getString(index));
                    break;
                default:
                    // do nothing
                    break;
            }
        }
        return result;
    }

    public static ContentValues[] mapSites(JSONArray sitesJSON) throws JSONException {

        ContentValues[] sites = new ContentValues[sitesJSON.length()];
        for (int i=0; i<sites.length; i++) {
            sites[i] = mapSite(sitesJSON.getJSONObject(i));
        }

        return sites;
    }

    public static ContentValues mapSite(JSONObject site) throws JSONException {
        // (from server download).

        return toContentValues(site, FieldCaptureContent.SITE_FLAT_COLUMNS);

    }

    public static ContentValues toContentValues(JSONObject jsonObject, String[] columns) throws JSONException {
        ContentValues values = new ContentValues();
        Iterator<String> keys;
        if (columns != null) {
            keys = Arrays.asList(columns).iterator();
        }
        else {
            keys =  jsonObject.keys();
        }
        while (keys.hasNext()) {
            String key = keys.next();

            Object value = jsonObject.opt(key);
            if (value instanceof String) {
                values.put(key, (String) value);
            }
            else if (value instanceof Integer) {
                values.put(key, (Integer)value);
            }
            else if (value instanceof Float) {
                values.put(key, (Float)value);
            }
            else if (value instanceof JSONArray) {
                values.put(key, value.toString());
            }
            else if (value instanceof JSONObject) {
                values.put(key, value.toString());
            }

        }
        return values;

    }

    public static ContentValues[] mapProjectSites(String projectId, JSONArray sites) throws JSONException {
        ContentValues[] values = new ContentValues[sites.length()];
        for (int i=0; i<sites.length(); i++) {
            values[i] = new ContentValues();
            values[i].put(FieldCaptureContent.PROJECT_ID, projectId);
            values[i].put(FieldCaptureContent.SITE_ID, sites.getJSONObject(i).getString(FieldCaptureContent.SITE_ID));
        }
        return values;
    }

    public static JSONObject mapSite(Cursor data) throws JSONException {

        JSONObject site = toJSONObject(data, FieldCaptureContent.SITE_FLAT_COLUMNS);
        // TODO photopoints not yet supported so there is no point doing the work here.
//        String encodedPhotoPoints = data.getString(data.getColumnIndex(FieldCaptureContent.));
//        if (StringUtils.hasLength( encodedPhotoPoints)) {
//            site.put(FieldCaptureContent., new JSONArray(encodedPhotoPoints));
//        }
//        else {
//            site.put(FieldCaptureContent.PHOTO_POINTS_COLUMN, new JSONArray());
//        }
        return site;
    }
}
