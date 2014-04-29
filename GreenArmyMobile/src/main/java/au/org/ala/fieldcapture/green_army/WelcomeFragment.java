package au.org.ala.fieldcapture.green_army;

import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;


/**
 * Displays a welcome message and is a placeholder when the user has no projects or activities.
 */
public class WelcomeFragment extends Fragment {

    public static final String TEXT_RESOURCE_ARG = "textResourceId";

    private int textResourceId = R.string.no_activities_text;

    /**
     * Use this factory method to create a new instance of
     * this fragment using the provided parameters.
     */
    public static WelcomeFragment newInstance() {
        WelcomeFragment fragment = new WelcomeFragment();
        return fragment;
    }

    public WelcomeFragment() {
        // Required empty public constructor
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Bundle args = getArguments();
        if (args != null) {
            textResourceId = args.getInt(TEXT_RESOURCE_ARG, R.string.no_activities_text);
        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        View view = inflater.inflate(R.layout.fragment_welcome, container, false);


        TextView textView = (TextView)view.findViewById(R.id.welcome_text);
        textView.setText(textResourceId);

        return view;
    }


}
