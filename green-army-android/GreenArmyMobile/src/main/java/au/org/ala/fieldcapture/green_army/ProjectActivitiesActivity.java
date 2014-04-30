package au.org.ala.fieldcapture.green_army;

import android.content.Intent;
import android.os.Bundle;
import android.support.v4.app.FragmentActivity;
import android.support.v4.app.NavUtils;
import android.view.MenuItem;


/**
 * An activity representing a single Project detail screen. This
 * activity is only used on handset devices. On tablet-size devices,
 * item details are presented side-by-side with a list of items
 * in a {@link ProjectListActivity}.
 * <p>
 * This activity is mostly just a 'shell' activity containing nothing
 * more than a {@link ActivityListFragment}.
 */
public class ProjectActivitiesActivity extends FragmentActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_project_activities);

        // Show the Up button in the action bar.
        getActionBar().setDisplayHomeAsUpEnabled(true);

        // savedInstanceState is non-null when there is fragment state
        // saved from previous configurations of this activity
        // (e.g. when rotating the screen from portrait to landscape).
        // In this case, the fragment will automatically be re-added
        // to its container so we don't need to manually add it.
        // For more information, see the Fragments API guide at:
        //
        // http://developer.android.com/guide/components/fragments.html
        //
        if (savedInstanceState == null) {
            // Create the detail fragment and add it to the activity
            // using a fragment transaction.
            Bundle arguments = new Bundle();
            arguments.putString(ActivityListFragment.ARG_PROJECT_ID,
                    getIntent().getStringExtra(ActivityListFragment.ARG_PROJECT_ID));
            ActivityListFragment fragment = new ActivityListFragment();
            fragment.setArguments(arguments);
            getSupportFragmentManager().beginTransaction()
                    .add(R.id.project_detail_container, fragment)
                    .commit();
        }

//        DrawerLayout drawer = (DrawerLayout)findViewById(R.id.drawer_layout);
//        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(this, drawer, R.drawable.ic_drawer, R.string.drawer_open, R.string.drawer_close) {
//            public void onDrawerClosed(View view) {
//                super.onDrawerClosed(view);
//                getActionBar().setTitle("Activities");
//            }
//
//            /** Called when a drawer has settled in a completely open state. */
//            public void onDrawerOpened(View drawerView) {
//                super.onDrawerOpened(drawerView);
//                getActionBar().setTitle("Projects");
//            }
//        };
//        drawer.setDrawerListener(toggle);
//        getActionBar().setHomeButtonEnabled(true);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        int id = item.getItemId();
        if (id == android.R.id.home) {
            // This ID represents the Home or Up button. In the case of this
            // activity, the Up button is shown. Use NavUtils to allow users
            // to navigate up one level in the application structure. For
            // more details, see the Navigation pattern on Android Design:
            //
            // http://developer.android.com/design/patterns/navigation.html#up-vs-back
            //
            NavUtils.navigateUpTo(this, new Intent(this, ProjectListActivity.class));
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
}
