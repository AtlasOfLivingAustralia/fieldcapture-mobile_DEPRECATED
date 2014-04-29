package org.ala.fieldcapture.merit.test;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.test.ProviderTestCase2;

import au.org.ala.fieldcapture.green_army.data.FieldCaptureContent;
import au.org.ala.fieldcapture.green_army.data.FieldCaptureContentProvider;
import au.org.ala.fieldcapture.green_army.data.FieldCaptureDatabaseHelper;

import org.junit.Test;

/**
 * Tests the FieldCaptureContentProvider.
 */
public class FieldCaptureContentProviderTests extends ProviderTestCase2<FieldCaptureContentProvider> {

    public FieldCaptureContentProviderTests() {
        super(FieldCaptureContentProvider.class, FieldCaptureContent.AUTHORITY);
    }

    private SQLiteDatabase db;

    static abstract class DatabaseHelper {

        public void run(SQLiteDatabase db) throws Exception {
            db.beginTransaction();
            try {
                doInTransaction(db);
                db.setTransactionSuccessful();
            }
            finally {
                db.endTransaction();
            }
        }

        public abstract void doInTransaction(SQLiteDatabase db) throws Exception;

    }


    @Override
    protected void setUp() throws Exception {

        super.setUp();
        FieldCaptureDatabaseHelper helper = (FieldCaptureDatabaseHelper)getProvider().getDatabaseHelper();

        db = helper.getWritableDatabase();

        new DatabaseHelper() {
            public void doInTransaction(SQLiteDatabase db) throws Exception {
                db.delete("project", null, null);
                db.delete("activity", null, null);

            }
        }.run(db);
    }

    private void insertProject(String id) {
        db.beginTransaction();

        ContentValues vals = new ContentValues();
        vals.put("projectId", id);

        db.insert("project", null, vals);

        db.setTransactionSuccessful();
        db.endTransaction();
    }

    private void insertActivity(String id) {

        db.beginTransaction();

        ContentValues vals = new ContentValues();
        vals.put("activityId", id);

        db.insert("activity", null, vals);

        db.setTransactionSuccessful();
        db.endTransaction();
    }

    @Override
    public void tearDown() throws Exception {

        try {
            FieldCaptureDatabaseHelper helper = (FieldCaptureDatabaseHelper) getProvider().getDatabaseHelper();
            helper.close();
        }
        catch (Exception e) {
            e.printStackTrace();
        }
        super.tearDown();
    }

    @Test
    public void testProjectsQuery() {

        String projectId = "1";
        insertProject(projectId);

        Uri queryUri = FieldCaptureContent.allProjectsUri();
        Cursor result = getMockContentResolver().query(queryUri, null, null, null, null);
        assertEquals("All projects returned", result.getCount(), 1);
        result.moveToPosition(0);
        assertEquals("Correct project id", result.getString(result.getColumnIndex("projectId")), projectId);
    }

    @Test
    public void testSaveActivityData() {

        String activityId = "activity1";
        insertActivity(activityId);

        Uri activityUri = FieldCaptureContent.activityUri(activityId);
        Cursor result = getMockContentResolver().query(activityUri, null, null, null, null);
        assertEquals("Activity returned", 1, result.getCount());
        result.moveToPosition(0);

        assertEquals("Correct activity id", result.getString(result.getColumnIndex(FieldCaptureContent.ACTIVITY_ID)), activityId);

        String outputData = "{outputs:[]}";
        ContentValues vals = new ContentValues();
        vals.put("outputs", outputData);
        getMockContentResolver().update(activityUri, vals, FieldCaptureContent.ACTIVITY_ID+" = ?", new String[]{activityId});

        // Make sure we didn't inadvertently update more than one row.
        result = db.query("activity", null, null, null, null, null, null, null);
        assertEquals("Only one activity still", result.getCount(), 1);

        result = getMockContentResolver().query(activityUri, null, null, null, null);
        assertEquals("Activity returned", 1, result.getCount());
        result.moveToPosition(0);

        assertEquals("Correct activity id", activityId, result.getString(result.getColumnIndex(FieldCaptureContent.ACTIVITY_ID)));
        assertEquals("Correct output data", outputData, result.getString(result.getColumnIndex("outputs")));


    }




}
