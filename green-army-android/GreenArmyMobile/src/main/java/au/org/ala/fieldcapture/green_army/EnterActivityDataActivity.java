package au.org.ala.fieldcapture.green_army;

import android.os.Bundle;
import android.support.v4.app.FragmentActivity;


/**
 * Container for the EnterActivityDataFragment.
 */
public class EnterActivityDataActivity extends FragmentActivity {


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_enter_activity_data);

        String activityId = getIntent().getStringExtra(EnterActivityData.ARG_ACTIVITY_ID);
        if (savedInstanceState == null) {
            // Create the detail fragment and add it to the activity
            // using a fragment transaction.

            Bundle arguments = new Bundle();
            arguments.putString(EnterActivityData.ARG_ACTIVITY_ID, activityId);
            EnterActivityData fragment = new EnterActivityData();


            fragment.setArguments(arguments);
            getSupportFragmentManager().beginTransaction()
                    .add(R.id.activity_web_view_container, fragment)
                    .commit();
        }

    }
}
