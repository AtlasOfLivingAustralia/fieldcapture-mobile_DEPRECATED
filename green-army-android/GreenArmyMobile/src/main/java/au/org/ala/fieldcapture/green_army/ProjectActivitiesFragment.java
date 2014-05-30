package au.org.ala.fieldcapture.green_army;

import android.graphics.drawable.AnimationDrawable;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentStatePagerAdapter;
import android.support.v4.view.ViewPager;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

/**
 * A fragment that displays various views of activities.
 */
public class ProjectActivitiesFragment extends Fragment implements StatusFragment.StatusCallback {

    /**
     * The fragment argument representing the item ID that this fragment
     * represents.
     */
    public static final String ARG_PROJECT_ID = "project_id";

    private static String PROGRESS_ORDERING_STATEMENT = "case when progress='started' then 0 when progress='started' then 1 when progress='planned' then 2 when progress='deferred' then 3 when progress='cancelled' then 4 end";

    public static ProjectActivitiesFragment getInstance(String projectId) {
        ProjectActivitiesFragment fragment = new ProjectActivitiesFragment();
        Bundle args = new Bundle();
        args.putString(ARG_PROJECT_ID, projectId);

        fragment.setArguments(args);
        return fragment;
    }


    private ViewPager viewPager;
    private PagerAdapter pagerAdapter;
    private View syncStatusBar;
    private TextView syncText;
    private ImageView syncIcon;


    public static class PagerAdapter extends FragmentStatePagerAdapter {

        private final String[] PAGES = new String[] {"Activities By Start Date", "Activities By Type", "Activities By Site", "Activities By Progress"};
        private final String[] SORT_ORDER = new String[] {"plannedStartDate, "+PROGRESS_ORDERING_STATEMENT, "type", "case when siteName is null then 1 else 0 end,siteName", PROGRESS_ORDERING_STATEMENT};

        private ActivityListFragment[] fragments = new ActivityListFragment[PAGES.length];

        private String query;
        private String projectId;
        public PagerAdapter(FragmentManager fragmentManager, String projectId) {
            super(fragmentManager);
            this.projectId = projectId;
            this.query = null;
        }

        @Override
        public Fragment getItem(int i) {
            ActivityListFragment fragment = ActivityListFragment.getInstance(projectId, SORT_ORDER[i], query);
            fragments[i] = fragment;

            return fragment;
        }

        @Override
        public void destroyItem(ViewGroup container, int position, Object object) {
            fragments[position] = null;
            super.destroyItem(container, position, object);
        }

        @Override
        public int getCount() {
            return PAGES.length;
        }

        @Override
        public CharSequence getPageTitle(int position) {
            return PAGES[position];
        }

        public void query(String query) {
            this.query = query;
            for (int i=0; i<fragments.length; i++) {
                if (fragments[i] != null) {
                    fragments[i].query(query);
                }
            }
        }
    }

    /**
     * Mandatory empty constructor for the fragment manager to instantiate the
     * fragment (e.g. upon screen orientation changes).
     */
    public ProjectActivitiesFragment() {
    }

    public void doSearch(String query) {
        pagerAdapter.query(query);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d("ProjectActivitiesFragment", "onCreate:"+savedInstanceState);

        pagerAdapter = new PagerAdapter(getFragmentManager(), getArguments().getString(ARG_PROJECT_ID));


    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View root = inflater.inflate(R.layout.fragment_project_activities, container, false);

        viewPager = (ViewPager)root.findViewById(R.id.pager);
        viewPager.setAdapter(pagerAdapter);

        syncStatusBar = root.findViewById(R.id.sync_status_bar);
        syncText = (TextView)root.findViewById(R.id.sync_status_text);
        syncIcon = (ImageView)root.findViewById(R.id.sync_icon);
        return root;
    }




    public void onStatusChanged(StatusFragment.Status status) {

        if (status.syncPending) {
            syncText.setText(getString(R.string.waiting_for_sync));
            syncStatusBar.setVisibility(View.VISIBLE);
            ((AnimationDrawable)syncIcon.getDrawable()).start();
        }
        else if (status.syncInProgress) {
            syncText.setText(getString(R.string.sync_in_progress));

            syncStatusBar.setVisibility(View.VISIBLE);
            ((AnimationDrawable)syncIcon.getDrawable()).start();
        }
        else {
            ((AnimationDrawable)syncIcon.getDrawable()).stop();
            syncStatusBar.setVisibility(View.GONE);

        }
    }
}
