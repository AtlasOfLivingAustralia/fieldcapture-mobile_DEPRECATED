package org.ala.fieldcapture.merit.test;

import android.test.AndroidTestCase;
import android.test.mock.MockContext;
import android.util.Log;

import junit.framework.TestCase;

import au.org.ala.fieldcapture.green_army.data.EcodataInterface;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Before;
import org.junit.Test;

import java.util.List;

/**
 *
 */
public class EcodataInterfaceTest extends AndroidTestCase {

    private EcodataInterface ecodataInterface;

    @Before
    public void setUp() {
        setContext(new MockContext());
        ecodataInterface = new EcodataInterface(getContext());
    }

    @Test
    public void testDownloadProjects() {
        List result = ecodataInterface.getProjectsForUser();
        Log.d("test", result.toString());
    }

    @Test
    public void testDownloadActivities() throws Exception {
        JSONObject result = ecodataInterface.getProjectDetails("325f4a71-fa22-46b3-a315-2371f61f6740");
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
