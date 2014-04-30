package au.org.ala.fieldcapture.green_army;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import android.support.v4.app.ActionBarDrawerToggle;
import android.support.v4.app.FragmentActivity;
import android.support.v4.widget.DrawerLayout;
import android.view.Gravity;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;

import au.org.ala.fieldcapture.green_army.data.PreferenceStorage;
import au.org.ala.fieldcapture.green_army.data.FieldCaptureContent;


/**
 * An activity representing a list of Activity. This activity
 * has different presentations for handset and tablet-size devices. On
 * handsets, the activity presents a list of items, which when touched,
 * lead to a {@link ProjectActivitiesActivity} representing
 * item details. On tablets, the activity presents the list of items and
 * item details side-by-side using two vertical panes.
 * <p>
 * The activity makes heavy use of fragments. The list of items is a
 * {@link ProjectListFragment} and the item details
 * (if present) is a {@link ProjectActivitiesFragment}.
 * <p>
 * This activity also implements the required
 * {@link ProjectListFragment.Callbacks} interface
 * to listen for item selections.
 */
public class ProjectListActivity extends FragmentActivity
        implements ProjectListFragment.Callbacks {

    /**
     * Whether or not the activity is in two-pane mode, i.e. running on a tablet
     * device.
     */
    private boolean mTwoPane;

    private ActionBarDrawerToggle toggle;
    private DrawerLayout drawer;
    private PreferenceStorage preferenceStorage;

    private String checkLogin() {

        if (!preferenceStorage.isAuthenticated()) {

            Intent loginIntent = new Intent(this, LoginActivity.class);
            startActivity(loginIntent);
            finish();
            return null;
        }
        return preferenceStorage.getUsername();
    }

    private void logout() {
        preferenceStorage.clear();
        checkLogin();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        preferenceStorage = PreferenceStorage.getInstance(this);
        if (preferenceStorage.getFirstUse()) {
            Intent welcome = new Intent(this, WelcomeActivity.class);
            startActivity(welcome);
            finish();
            return;
        }


        String user = checkLogin();
        // If the user isn't logged in this activity will be finished and the login activity started.
        if (user != null) {

            Account account = CreateSyncAccount(this, user);
            getContentResolver().setSyncAutomatically(account, FieldCaptureContent.AUTHORITY, true);
            setContentView(R.layout.activity_project_list);

            if (findViewById(R.id.project_detail_container) != null) {
                // The detail container view will be present only in the
                // large-screen layouts (res/values-large and
                // res/values-sw600dp). If this view is present, then the
                // activity should be in two-pane mode.
                mTwoPane = true;

                WelcomeFragment fragment = WelcomeFragment.newInstance();
                getSupportFragmentManager().beginTransaction()
                        .replace(R.id.project_detail_container, fragment)
                        .commit();

                // In two-pane mode, list items should be given the
                // 'activated' state when touched.
                ((ProjectListFragment) getSupportFragmentManager()
                        .findFragmentById(R.id.project_list))
                        .setActivateOnItemClick(true);
            }
            if (findViewById(R.id.drawer_layout) != null) {
                drawer = (DrawerLayout)findViewById(R.id.drawer_layout);
                toggle = new ActionBarDrawerToggle(this, drawer, R.drawable.ic_navigation_drawer, R.string.drawer_open, R.string.drawer_close) {
                    public void onDrawerClosed(View view) {
                        super.onDrawerClosed(view);
                        getActionBar().setTitle("Project Activities");
                    }

                    /** Called when a drawer has settled in a completely open state. */
                    public void onDrawerOpened(View drawerView) {
                        super.onDrawerOpened(drawerView);
                        getActionBar().setTitle("Projects");
                    }
                };
                drawer.setDrawerListener(toggle);
                drawer.openDrawer(Gravity.LEFT);
                getActionBar().setDisplayShowHomeEnabled(true);
                getActionBar().setDisplayHomeAsUpEnabled(true);

                getActionBar().setHomeButtonEnabled(true);
            }
        }
    }

    @Override
    protected void onPostCreate(Bundle savedInstanceState) {
        super.onPostCreate(savedInstanceState);
        // Sync the toggle state after onRestoreInstanceState has occurred.
        if (toggle != null) {
            toggle.syncState();
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (toggle != null) {
            toggle.onConfigurationChanged(newConfig);
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.main, menu);
        return true;
    }


    /**
     * Callback method from {@link ProjectListFragment.Callbacks}
     * indicating that the item with the given ID was selected.
     */
    @Override
    public void onItemSelected(String projectId) {
        if (mTwoPane) {
            // In two-pane mode, show the detail view in this activity by
            // adding or replacing the detail fragment using a
            // fragment transaction.
            Bundle arguments = new Bundle();
            arguments.putString(ProjectActivitiesFragment.ARG_PROJECT_ID, projectId);
            ProjectActivitiesFragment fragment = new ProjectActivitiesFragment();
            fragment.setArguments(arguments);
            getSupportFragmentManager().beginTransaction()
                    .replace(R.id.project_detail_container, fragment)
                    .commit();
            if (drawer != null) {
                drawer.closeDrawer(Gravity.LEFT);
            }

        } else {
            // In single-pane mode, simply start the detail activity
            // for the selected item ID.
            Intent detailIntent = new Intent(this, ProjectActivitiesActivity.class);
            detailIntent.putExtra(ProjectActivitiesFragment.ARG_PROJECT_ID, projectId);
            startActivity(detailIntent);
        }
    }


    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Pass the event to ActionBarDrawerToggle, if it returns
        // true, then it has handled the app icon touch event
        if (toggle != null && toggle.onOptionsItemSelected(item)) {
            return true;
        }
        switch (item.getItemId()) {

            case R.id.logout_menu_item:
                logout();
                return true;

            case R.id.refresh_menu_item:
                FieldCaptureContent.requestSync(this, true);
                return true;
        }

        return super.onOptionsItemSelected(item);
    }

    public static Account CreateSyncAccount(Context context, String userName) {
        // Create the account type and default account
        Account newAccount = new Account(
                userName, FieldCaptureContent.ACCOUNT_TYPE);
        // Get an instance of the Android account manager
        AccountManager accountManager =
                (AccountManager) context.getSystemService(
                        ACCOUNT_SERVICE);
        /*
         * Add the account and account type, no password or user data
         * If successful, return the Account object, otherwise report an error.
         */
        if (accountManager.addAccountExplicitly(newAccount, null, null)) {


            /*
             * If you don't set android:syncable="true" in
             * in your <provider> element in the manifest,
             * then call context.setIsSyncable(account, AUTHORITY, 1)
             * here.
             */
        }
        return newAccount;
    }
}

