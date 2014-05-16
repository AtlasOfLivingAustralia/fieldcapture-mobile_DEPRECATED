package au.org.ala.fieldcapture.green_army.data;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

/**
 * Responsible for creating & updating the database.
 */
public class FieldCaptureDatabaseHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "FieldCapture.db";
    private static final int SCHEMA_VERSION = 1;

    private static FieldCaptureDatabaseHelper instance;
    public synchronized static FieldCaptureDatabaseHelper getInstance(Context ctx) {
        if (instance == null) {
            instance = new FieldCaptureDatabaseHelper(ctx.getApplicationContext());
        }
        return instance;
    }

    public FieldCaptureDatabaseHelper(Context ctx) {
        super(ctx, DATABASE_NAME, null, SCHEMA_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {


        try {
            db.beginTransaction();

            db.execSQL("CREATE TABLE project (" +
                    "_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "projectId TEXT NOT NULL UNIQUE, " +
                    "name TEXT, " +
                    "description TEXT, " +
                    "grantId TEXT, " +
                    "externalId TEXT, " +
                    "plannedStartDate TEXT, " +
                    "plannedEndDate TEXT, " +
                    "organisationName TEXT, " +
                    "lastUpdated TEXT)");

            db.execSQL("CREATE TABLE activity (" +
                    "_id INTEGER PRIMARY KEY AUTOINCREMENT, "+
                    FieldCaptureContent.ACTIVITY_ID+" TEXT NOT NULL UNIQUE, " +
                    "projectId TEXT, " +
                    "siteId TEXT, "+
                    "type TEXT, " +
                    "description TEXT, " +
                    "projectStage TEXT, " +
                    "progress TEXT, " +
                    "mainTheme TEXT, " +
                    "plannedStartDate TEXT, " +
                    "plannedEndDate TEXT, " +
                    "startDate TEXT, " +
                    "endDate TEXT, " +
                    "themes TEXT, "+
                    "lastUpdated TEXT, " +
                    "syncStatus TEXT, " +
                    "outputs TEXT )");

            db.execSQL("CREATE TABLE site (_id INTEGER PRIMARY KEY AUTOINCREMENT, siteId TEXT NOT NULL UNIQUE, name TEXT, description TEXT, centroidLat REAL, centroidLon REAL, geometry TEXT, photoPoints TEXT, projectId TEXT, syncStatus TEXT, lastUpdated TEXT)");
            db.execSQL("CREATE TABLE project_sites (projectId INTEGER, siteId INTEGER, UNIQUE(projectId, siteId))");

            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }

    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {

    }
}
