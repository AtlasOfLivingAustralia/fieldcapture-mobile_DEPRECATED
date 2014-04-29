package org.ala.fieldcapture.merit.test;

import android.util.Log;

import junit.framework.TestCase;

import au.org.ala.fieldcapture.green_army.data.EcodataInterface;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Before;
import org.junit.Test;

import java.util.List;

/**
 * Created by god08d on 9/04/14.
 */
public class EcodataInterfaceTest extends TestCase {

    private EcodataInterface ecodataInterface;

    @Before
    public void setUp() {
        ecodataInterface = new EcodataInterface();


    }

    @Test
    public void testDownloadProjects() {
        List result = ecodataInterface.getProjectsForUser("chris.godwin.ala@gmail.com", "ef98e873-f8fb-4e8e-8159-b9c12d50c019");

        Log.d("test", result.toString());

    }


    @Test
    public void testDownloadActivities() throws Exception {
        JSONArray result = ecodataInterface.getProjectActivities("325f4a71-fa22-46b3-a315-2371f61f6740", "chris.godwin.ala@gmail.com", "ef98e873-f8fb-4e8e-8159-b9c12d50c019");

        Log.d("test", result.toString());

    }


    @Test
    public void testUploadActivity() throws Exception {
        JSONObject activity = new JSONObject();
        activity.put("activityId", "ecb53ea2-af82-496f-b28d-940752d482d5");
        activity.put("progress", "started");

        ecodataInterface.saveActivity(activity);
    }

}
