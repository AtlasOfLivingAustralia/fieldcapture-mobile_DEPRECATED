package au.org.ala.fieldcapture.green_army;

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
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ListView;
import android.widget.ResourceCursorAdapter;
import android.widget.TextView;

import org.springframework.util.StringUtils;

import java.text.ParseException;
import java.text.SimpleDateFormat;
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

        private String projectId;
        public PagerAdapter(FragmentManager fragmentManager, String projectId) {
            super(fragmentManager);
            this.projectId = projectId;
        }

        @Override
        public Fragment getItem(int i) {
            return ActivityListFragment.getInstance(projectId, SORT_ORDER[i]);
        }

        @Override
        public int getCount() {
            return PAGES.length;
        }

        @Override
        public CharSequence getPageTitle(int position) {
            return PAGES[position];
        }
    }

    /**
     * Mandatory empty constructor for the fragment manager to instantiate the
     * fragment (e.g. upon screen orientation changes).
     */
    public ProjectActivitiesFragment() {
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

        //PagerTitleStrip tabs = (PagerTitleStrip)root.findViewById(R.id.pager_title_strip);


        return root;
    }

}
