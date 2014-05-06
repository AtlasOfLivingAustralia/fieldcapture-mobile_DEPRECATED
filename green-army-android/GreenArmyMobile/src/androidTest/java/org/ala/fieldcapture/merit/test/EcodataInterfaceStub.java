package org.ala.fieldcapture.merit.test;

import android.content.Context;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import au.org.ala.fieldcapture.green_army.data.EcodataInterface;

/**
 * Stubs the EcodataInterface to assist testing.
 */
public class EcodataInterfaceStub extends EcodataInterface {

    // Configuration for testing the login method.
    private LoginResult loginResultToReturn;
    private String suppliedLoginUsername;
    private String suppliedLoginPassword;


    private JSONObject projectsForUserToReturn;

    private Map<String, JSONObject> projectDetailsToReturn;

    private Map<String, JSONObject> suppliedActivities;

    public EcodataInterfaceStub(Context ctx) {
        super(ctx);
    }

    public void setLoginResult(LoginResult result) {
        loginResultToReturn = result;
    }

    public Map<String, JSONObject> getSuppliedActivities() {
        return suppliedActivities;
    }

    @Override
    public LoginResult login(String username, String password) {
        return super.login(username, password);
    }

    @Override
    public List<JSONObject> getProjectsForUser() {
        return new ArrayList<JSONObject>();
    }

    public void setProjectDetails(String projectId, JSONObject projectDetails) {
        if (projectDetailsToReturn == null) {
            projectDetailsToReturn = new HashMap<String, JSONObject>();
        }
        projectDetailsToReturn.put(projectId, projectDetails);
    }

    @Override
    public JSONObject getProjectDetails(String projectId) {
        return projectDetailsToReturn.get(projectId);
}

    @Override
    public boolean saveActivity(JSONObject activityJSON) {
        if (suppliedActivities == null) {
            suppliedActivities = new HashMap<String, JSONObject>();
        }
        try {
            suppliedActivities.put(activityJSON.getString("activityId"), activityJSON);
        }
        catch (JSONException e) {
            throw new IllegalArgumentException("Activity JSON must include an attribute called activityId");
        }

        return true;
    }
}
