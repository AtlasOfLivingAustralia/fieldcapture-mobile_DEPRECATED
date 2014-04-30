package au.org.ala.fieldcapture.green_army;

import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.app.LoaderManager;
import android.support.v4.content.CursorLoader;
import android.support.v4.content.Loader;
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
 * A fragment that displays the list of activities for a project.
 */
public class ProjectActivitiesFragment extends Fragment implements LoaderManager.LoaderCallbacks<Cursor>, AdapterView.OnItemClickListener {

    /** View holder for the view of a single Activity */
    public static class ActivityViewHolder {
        TextView description;
        TextView type;
        TextView progress;
        TextView activityDates;
    }

    static class ActivityAdapter extends ResourceCursorAdapter {

        private SimpleDateFormat sourceFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
        private SimpleDateFormat displayFormat = new SimpleDateFormat("dd/MM/yyyy");

        public ActivityAdapter(Context context, Cursor cursor, int flags) {
            super(context, R.layout.activity_layout, cursor, flags);
        }

        @Override
        public View newView(Context context, Cursor cursor, ViewGroup parent) {
            View newView = super.newView(context, cursor, parent);
            initView(newView);
            return newView;
        }

        private void initView(View view) {
            ActivityViewHolder viewHolder = new ActivityViewHolder();
            viewHolder.description = (TextView)view.findViewById(R.id.activity_description);
            viewHolder.type = (TextView)view.findViewById(R.id.activity_type);
            viewHolder.progress = (TextView)view.findViewById(R.id.activity_status);
            viewHolder.activityDates = (TextView)view.findViewById(R.id.activity_dates);

            view.setTag(viewHolder);
        }

        @Override
        public void bindView(View view, Context context, Cursor cursor) {

            ActivityViewHolder viewHolder = (ActivityViewHolder)view.getTag();
            if (viewHolder == null) {
                initView(view);
            }

            viewHolder.description.setText(cursor.getString(cursor.getColumnIndex("description")));
            viewHolder.type.setText(cursor.getString(cursor.getColumnIndex("type")));

            // Format dates for display.
            String startDate = cursor.getString(cursor.getColumnIndex("plannedStartDate"));
            String endDate = cursor.getString(cursor.getColumnIndex("plannedEndDate"));

            if (StringUtils.hasLength(startDate) && StringUtils.hasLength(endDate)) {
                try {
                    Date date = sourceFormat.parse(startDate);
                    startDate = displayFormat.format(date);

                    date = sourceFormat.parse(endDate);
                    endDate = displayFormat.format(date);
                    viewHolder.activityDates.setText(startDate + " - " + endDate);
                }
                catch (ParseException e) {
                    Log.e("ActivityAdapter", "Invalid activity dates: "+startDate+", "+endDate, e);
                    viewHolder.activityDates.setText("");
                }
            }
            else {
                viewHolder.activityDates.setText("");
                Log.e("ActivityAdapter", "Missing activity dates: "+startDate+", "+endDate);

            }

            String progress = cursor.getString(cursor.getColumnIndex("progress"));
            String progressText;
            int progressColor;
            if ("planned".equals(progress)) {
                progressText = "P";
                progressColor = R.color.planned_activity_background;
            }
            else if ("started".equals(progress)) {
                progressText = "S";
                progressColor = R.color.started_activity_background;
            }
            else if ("finished".equals(progress)) {
                progressText = "F";
                progressColor = R.color.finished_activity_background;
            }
            else if ("deferred".equals(progress)) {
                progressText = "D";
                progressColor = R.color.deferred_activity_background;
            }
            else if ("cancelled".equals(progress)) {
                progressText = "C";
                progressColor = R.color.cancelled_activity_background;
            }
            else {
                Log.e("ActivityAdapter", "Invalid progress for activity: "+progress);
                progressText = "P";
                progressColor = R.color.planned_activity_background;
            }

            viewHolder.progress.setText(progressText);
            viewHolder.progress.setBackgroundResource(progressColor);
            viewHolder.progress.setTextColor(context.getResources().getColor(android.R.color.white));
        }
    }

    /**
     * The fragment argument representing the item ID that this fragment
     * represents.
     */
    public static final String ARG_PROJECT_ID = "project_id";

    /** Identifies the loader we are using */
    private static final int ACTIVITY_LOADER_ID = 1;

    private ActivityAdapter mAdapter;

    @Override
    public Loader<Cursor> onCreateLoader(int id, Bundle args) {

        String projectId = args.getString(ARG_PROJECT_ID);
        switch (id) {
            case ACTIVITY_LOADER_ID:
                Uri activitiesUri = Uri.parse(FieldCaptureContent.PROJECT_ACTIVITIES_URI.replace("*", projectId));
                return new CursorLoader(getActivity(), activitiesUri, null, "projectId=?", new String[] {projectId}, "plannedStartDate");
            default:
                return null;
        }

    }

    @Override
    public void onLoadFinished(Loader<Cursor> loader, Cursor data) {
        getView().findViewById(R.id.loading_activities).setVisibility(View.GONE);
        if (data.getCount() == 0) {
            // Force a refresh from the server.
            FieldCaptureContent.requestSync(getActivity(), true);

            getView().findViewById(R.id.no_activities).setVisibility(View.VISIBLE);
            getView().findViewById(R.id.project_activities_list).setVisibility(View.GONE);
        }
        else {
            getView().findViewById(R.id.no_activities).setVisibility(View.GONE);
            getView().findViewById(R.id.project_activities_list).setVisibility(View.VISIBLE);
        }
        mAdapter.changeCursor(data);
    }

    @Override
    public void onLoaderReset(Loader<Cursor> loader) {
        mAdapter.changeCursor(null);
    }

    public ListView listView;


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
            mAdapter = new ActivityAdapter(getActivity(), null, 0);
            getLoaderManager().initLoader(ACTIVITY_LOADER_ID, getArguments(), this);


        }
    }





    @Override
    public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
        Cursor activityData = (Cursor)mAdapter.getItem(position);

        Intent activityDataIntent = new Intent(getActivity(), EnterActivityDataActivity.class);
        activityDataIntent.putExtra(EnterActivityData.ARG_ACTIVITY_ID, activityData.getString(activityData.getColumnIndex(FieldCaptureContent.ACTIVITY_ID)));
        startActivity(activityDataIntent);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View root = inflater.inflate(R.layout.fragment_project_activities, container, false);
        listView = (ListView)root.findViewById(R.id.project_activities_list);
        listView.setAdapter(mAdapter);
        listView.setOnItemClickListener(this);

        return root;
    }

}
