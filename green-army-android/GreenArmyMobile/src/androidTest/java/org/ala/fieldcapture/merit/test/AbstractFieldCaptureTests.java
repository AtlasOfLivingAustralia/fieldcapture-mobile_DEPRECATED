package org.ala.fieldcapture.merit.test;

import android.content.ContentValues;
import android.database.sqlite.SQLiteDatabase;
import android.test.ProviderTestCase2;

import au.org.ala.fieldcapture.green_army.data.FieldCaptureContent;
import au.org.ala.fieldcapture.green_army.data.FieldCaptureContentProvider;
import au.org.ala.fieldcapture.green_army.data.FieldCaptureDatabaseHelper;

/**
 * Base class for Field Capture android tests that use the FieldCapture content provider.
 */
public abstract class AbstractFieldCaptureTests extends ProviderTestCase2<FieldCaptureContentProvider> {


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


    protected SQLiteDatabase db;

    public AbstractFieldCaptureTests() {
        super(FieldCaptureContentProvider.class, FieldCaptureContent.AUTHORITY);
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

    protected void insertProject(String id) {
        db.beginTransaction();

        ContentValues vals = new ContentValues();
        vals.put("projectId", id);

        db.insert("project", null, vals);

        db.setTransactionSuccessful();
        db.endTransaction();
    }

    protected void insertActivity(String id) {
        insertActivity(id, new ContentValues());
    }

    protected void insertActivity(String id, ContentValues vals) {
        db.beginTransaction();

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
}
