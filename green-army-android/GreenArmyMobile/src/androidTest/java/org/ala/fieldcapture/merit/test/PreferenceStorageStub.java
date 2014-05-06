package org.ala.fieldcapture.merit.test;

import android.content.Context;

import au.org.ala.fieldcapture.green_army.data.PreferenceStorage;

/**
 * Stubs the PreferenceStorage class for testing.
 */
public class PreferenceStorageStub extends PreferenceStorage {

    private boolean firstUse = false;
    private String userName;
    private String authToken;

    public PreferenceStorageStub(Context ctx) {
        super(ctx);
    }

    @Override
    public boolean getFirstUse() {
        return firstUse;
    }

    @Override
    public void setFirstUse(boolean firstUse) {
        this.firstUse = firstUse;
    }

    @Override
    public boolean isAuthenticated() {
        return super.isAuthenticated();
    }

    @Override
    public String getAuthToken() {
        return authToken;
    }

    @Override
    public String getUsername() {
        return userName;
    }

    @Override
    public void saveCredentials(String username, String authToken) {
        this.userName = username;
        this.authToken = authToken;
    }

    @Override
    public void clear() {
        this.firstUse = true;
        this.userName = null;
        this.authToken = null;
    }
}
