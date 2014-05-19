package au.org.ala.fieldcapture.green_army;

import android.os.Bundle;
import android.support.v4.app.FragmentActivity;
import android.view.View;
import android.widget.ProgressBar;


/**
 * Container for the EnterActivityDataFragment.
 */
public class EnterActivityDataActivity extends FragmentActivity {


    private ProgressBar progressBar;
    private View webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_enter_activity_data);

        String activityId = getIntent().getStringExtra(EnterActivityData.ARG_ACTIVITY_ID);
        progressBar = (ProgressBar)findViewById(R.id.progress_bar);
        webView = findViewById(R.id.activity_web_view_container);

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

    public void hideProgressBar() {
        progressBar.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
    }
}
