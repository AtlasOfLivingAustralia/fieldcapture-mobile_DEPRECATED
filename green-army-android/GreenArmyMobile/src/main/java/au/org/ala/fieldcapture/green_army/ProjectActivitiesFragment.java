package au.org.ala.fieldcapture.green_army;

import android.app.SearchManager;
import android.app.SearchableInfo;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentStatePagerAdapter;
import android.support.v4.app.LoaderManager;
import android.support.v4.content.CursorLoader;
import android.support.v4.content.Loader;
import android.support.v4.view.PagerTabStrip;
import android.support.v4.view.PagerTitleStrip;
import android.support.v4.view.ViewPager;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ListView;
import android.widget.ResourceCursorAdapter;
import android.widget.SearchView;
import android.widget.TextView;

import org.springframework.util.StringUtils;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;

import au.org.ala.fieldcapture.green_army.data.FieldCaptureContent;

/**
 * A fragment that displays various views of activities.
 */
public class ProjectActivitiesFragment extends Fragment  {

    /**
     * The fragment argument representing the item ID that this fragment
     * represents.
     */
    public static final String ARG_PROJECT_ID = "project_id";

    public static ProjectActivitiesFragment getInstance(String projectId) {
        ProjectActivitiesFragment fragment = new ProjectActivitiesFragment();
        Bundle args = new Bundle();
        args.putString(ARG_PROJECT_ID, projectId);

        fragment.setArguments(args);
        return fragment;
    }


    private ViewPager viewPager;
    private PagerAdapter pagerAdapter;


    public static class PagerAdapter extends FragmentStatePagerAdapter {

        private final String[] PAGES = new String[] {"Activities By Start Date", "Activities By Type", "Activities By Progress"};
        private final String[] SORT_ORDER = new String[] {"plannedStartDate", "type", "progress"};

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

        if (getArguments().containsKey(ARG_PROJECT_ID)) {
            pagerAdapter = new PagerAdapter(getFragmentManager(), getArguments().getString(ARG_PROJECT_ID));

        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View root = inflater.inflate(R.layout.fragment_project_activities, container, false);

        viewPager = (ViewPager)root.findViewById(R.id.pager);
        viewPager.setAdapter(pagerAdapter);

        return root;
    }

}
