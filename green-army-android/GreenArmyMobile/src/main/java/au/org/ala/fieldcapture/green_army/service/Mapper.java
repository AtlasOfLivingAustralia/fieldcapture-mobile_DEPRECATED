package au.org.ala.fieldcapture.green_army.service;

import android.content.ContentValues;
import android.database.Cursor;
import android.util.Log;

import au.org.ala.fieldcapture.green_army.data.FieldCaptureContent;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

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
}
