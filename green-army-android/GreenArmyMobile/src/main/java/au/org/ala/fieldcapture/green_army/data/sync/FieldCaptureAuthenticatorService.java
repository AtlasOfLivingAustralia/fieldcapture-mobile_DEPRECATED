package au.org.ala.fieldcapture.green_army.data.sync;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;

/**
 * Created by god08d on 17/04/14.
 */
public class FieldCaptureAuthenticatorService extends Service {

    // Instance field that stores the authenticator object
    private FieldCaptureAuthenticator mAuthenticator;
    @Override
    public void onCreate() {
        // Create a new authenticator object
        mAuthenticator = new FieldCaptureAuthenticator(this);
    }
    /*
     * When the system binds to this Service to make the RPC call
     * return the authenticator's IBinder.
     */
    @Override
    public IBinder onBind(Intent intent) {
        return mAuthenticator.getIBinder();
    }
}