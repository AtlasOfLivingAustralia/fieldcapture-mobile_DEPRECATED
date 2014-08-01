package au.org.ala.fieldcapture.green_army;

import android.app.Activity;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v4.app.LoaderManager;
import android.support.v4.content.CursorLoader;
import android.support.v4.content.Loader;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ListView;
import android.widget.SimpleCursorAdapter;
import android.widget.TextView;

import au.org.ala.fieldcapture.green_army.data.FieldCaptureContent;
import au.org.ala.fieldcapture.green_army.data.PreferenceStorage;

/**
 * A list fragment representing a list of Activity. This fragment
 * also supports tablet devices by allowing list items to be given an
 * 'activated' state upon selection. This helps indicate which item is
 * currently being viewed in a {@link ActivityListFragment}.
 * <p>
 * Activities containing this fragment MUST implement the {@link Callbacks}
 * interface.
 */
public class ProjectListFragment extends Fragment implements LoaderManager.LoaderCallbacks<Cursor>, AdapterView.OnItemClickListener, StatusFragment.StatusCallback {

    /**
     * The serialization (saved instance state) Bundle key representing the
     * activated item position. Only used on tablets.
     */
    private static final String STATE_ACTIVATED_POSITION = "activated_position";

    public static final String LANDSCAPE_KEY = "landscape";

    /**
     * The fragment's current callback object, which is notified of list item
     * clicks.
     */
    private Callbacks mCallbacks = sDummyCallbacks;

    /**
     * The current activated item position. Only used on tablets.
     */
    private int mActivatedPosition = ListView.INVALID_POSITION;

    private ListView mListView;

    private View listContainer;
    private View progress;
    private View noProjectsMessage;
    private View loadingProjectsMessage;
    private View noNetworkWarning;
    private boolean noProjects;

    /** Identifies the loader we are using */
    private static final int PROJECT_LOADER_ID = 0;

    private PreferenceStorage preferences;


    /**
     * A callback interface that all activities containing this fragment must
     * implement. This mechanism allows activities to be notified of item
     * selections.
     */
    public interface Callbacks {
        /**
         * Callback for when an item has been selected.
         */
        public void onItemSelected(String id);

        public boolean isUsingNavigationDrawer();
    }

    /**
     * A dummy implementation of the {@link Callbacks} interface that does
     * nothing. Used only when this fragment is not attached to an activity.
     */
    private static Callbacks sDummyCallbacks = new Callbacks() {
        @Override
        public void onItemSelected(String id) {
        }
        @Override
        public boolean isUsingNavigationDrawer() {return false;}
    };



    private SimpleCursorAdapter mAdapter;

    @Override
    public Loader<Cursor> onCreateLoader(int id, Bundle args) {

        switch (id) {
            case PROJECT_LOADER_ID:
                Uri projectsUri = FieldCaptureContent.allProjectsUri();
                return new CursorLoader(getActivity(), projectsUri, null, null, null, null);
            default:
                return null;
        }

    }

    @Override
    public void onLoadFinished(Loader<Cursor> loader, Cursor data) {

        mAdapter.changeCursor(data);
        listContainer.setVisibility(View.VISIBLE);
        progress.setVisibility(View.GONE);

        if (data.getCount() == 0) {
            noProjects = true;
            // Force a refresh from the server.
            //FieldCaptureContent.requestSync(getActivity(), true);
            noProjectsMessage.setVisibility(View.VISIBLE);
            noNetworkWarning.setVisibility(StatusFragment.isNetworkAvaialble(getActivity())?View.GONE:View.VISIBLE);

            mListView.setVisibility(View.GONE);
        }
        else {

            noProjects = false;
            noProjectsMessage.setVisibility(View.GONE);
            loadingProjectsMessage.setVisibility(View.GONE);
            mListView.setVisibility(View.VISIBLE);

            // Attempt to initialise from the saved preference.
            if (mActivatedPosition == ListView.INVALID_POSITION) {
                String projectId = preferences.getMostRecentProjectId();
                if (projectId != null) {

                    int foundPosition = ListView.INVALID_POSITION;
                    for (int pos = 0; pos<data.getCount(); pos++) {
                        data.moveToPosition(pos);
                        if (projectId.equals(data.getString(data.getColumnIndex(FieldCaptureContent.PROJECT_ID)))) {
                            foundPosition = pos;
                            break;
                        }
                    }
                    if (foundPosition != ListView.INVALID_POSITION) {
                        setActivatedPosition(foundPosition);
                    }

                }
            }
            if (mActivatedPosition != ListView.INVALID_POSITION) {
                data.moveToPosition(mActivatedPosition);
                String projectName = data.getString(data.getColumnIndex("name"));
                getActivity().setTitle(projectName);
            }
        }


    }

    @Override
    public void onLoaderReset(Loader<Cursor> loader) {
        mAdapter.changeCursor(null);
    }

    /**
     * Mandatory empty constructor for the fragment manager to instantiate the
     * fragment (e.g. upon screen orientation changes).
     */
    public ProjectListFragment() {
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        boolean inDrawer = mCallbacks.isUsingNavigationDrawer();
        int layout = inDrawer ? R.layout.project_drawer_layout : R.layout.project_layout;
        String[] columns = new String[] {"projectId", "name", "description"};
        mAdapter = new SimpleCursorAdapter(getActivity(), layout, null, columns, new int[]{-1, android.R.id.text1,android.R.id.text2}, 0);
        preferences = PreferenceStorage.getInstance(getActivity());
        noProjects = true;

    }

    @Override
    public void onActivityCreated(Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);
        getLoaderManager().initLoader(PROJECT_LOADER_ID, null, this);
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View root = inflater.inflate(R.layout.fragment_project_list, container, false);
        mListView = (ListView)root.findViewById(R.id.project_list);
        mListView.setAdapter(mAdapter);
        mListView.setOnItemClickListener(this);

        PreferenceStorage storage = PreferenceStorage.getInstance(getActivity());
        TextView heading = (TextView)root.findViewById(R.id.project_title);
        heading.setText(storage.getUsername());

        listContainer = root.findViewById(R.id.project_list_container);
        progress = root.findViewById(R.id.project_list_progress);
        noProjectsMessage = root.findViewById(R.id.no_projects_message);
        loadingProjectsMessage = root.findViewById(R.id.loading_projects_message);
        noNetworkWarning = root.findViewById(R.id.no_network_warning);

        return root;
    }


    @Override
    public void onViewCreated(View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        // Restore the previously serialized activated item position.
        if (savedInstanceState != null
                && savedInstanceState.containsKey(STATE_ACTIVATED_POSITION)) {
            setActivatedPosition(savedInstanceState.getInt(STATE_ACTIVATED_POSITION));
        }

    }

    @Override
    public void onAttach(Activity activity) {
        super.onAttach(activity);

        // Activities containing this fragment must implement its callbacks.
        if (!(activity instanceof Callbacks)) {
            throw new IllegalStateException("Activity must implement fragment's callbacks.");
        }

        mCallbacks = (Callbacks) activity;
    }

    @Override
    public void onDetach() {
        super.onDetach();

        // Reset the active callbacks interface to the dummy implementation.
        mCallbacks = sDummyCallbacks;
    }

    @Override
    public void onItemClick(AdapterView<?> parent, View view, int position, long id) {

        // Notify the active callbacks interface (the activity, if the
        // fragment is attached to one) that an item has been selected.
        Cursor cursor = (Cursor)mAdapter.getItem(position);

        String projectName = cursor.getString(cursor.getColumnIndex("name"));
        mCallbacks.onItemSelected(cursor.getString(cursor.getColumnIndex(FieldCaptureContent.PROJECT_ID)));
        getActivity().setTitle(projectName);
    }

    @Override
    public void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (mActivatedPosition != ListView.INVALID_POSITION) {
            // Serialize and persist the activated item position.
            outState.putInt(STATE_ACTIVATED_POSITION, mActivatedPosition);
        }
    }

    /**
     * Turns on activate-on-click mode. When this mode is on, list items will be
     * given the 'activated' state when touched.
     */
    public void setActivateOnItemClick(boolean activateOnItemClick) {
        // When setting CHOICE_MODE_SINGLE, ListView will automatically
        // give items the 'activated' state when touched.
        mListView.setChoiceMode(activateOnItemClick
                ? ListView.CHOICE_MODE_SINGLE
                : ListView.CHOICE_MODE_NONE);

    }

    private void setActivatedPosition(int position) {
        if (position == ListView.INVALID_POSITION) {
            mListView.setItemChecked(mActivatedPosition, false);
        } else {
            mListView.setItemChecked(position, true);
        }

        mActivatedPosition = position;
    }

    @Override
    public void onStatusChanged(StatusFragment.Status status) {
        if (!noProjects) {
            return;
        }

        loadingProjectsMessage.setVisibility(status.syncInProgress?View.VISIBLE:View.GONE);
        noProjectsMessage.setVisibility(status.syncInProgress?View.GONE:View.VISIBLE);
        noNetworkWarning.setVisibility(StatusFragment.isNetworkAvaialble(getActivity())?View.GONE:View.VISIBLE);


    }

}
