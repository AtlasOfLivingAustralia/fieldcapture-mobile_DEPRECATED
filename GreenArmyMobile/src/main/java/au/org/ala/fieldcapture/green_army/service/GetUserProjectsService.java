package au.org.ala.fieldcapture.green_army.service;

import android.app.IntentService;
import android.content.Intent;
import android.content.Context;

/**
 * An {@link IntentService} subclass for handling asynchronous task requests in
 * a service on a separate handler thread.
 * <p>
 * TODO: Customize class - update intent actions, extra parameters and static
 * helper methods.
 */
public class GetUserProjectsService extends IntentService {
    // TODO: Rename actions, choose action names that describe tasks that this
    // IntentService can perform, e.g. ACTION_FETCH_NEW_ITEMS
    private static final String ACTION_GET_USER_PROJECTS = "org.ala.fieldcapture.merit_mobile_test.service.action.FOO";
    private static final String ACTION_BAZ = "org.ala.fieldcapture.merit_mobile_test.service.action.BAZ";

    // TODO: Rename parameters
    private static final String EXTRA_PARAM1 = "org.ala.fieldcapture.merit_mobile_test.service.extra.PARAM1";
    private static final String EXTRA_PARAM2 = "org.ala.fieldcapture.merit_mobile_test.service.extra.PARAM2";

    /**
     * Starts this service to perform action Foo with the given parameters. If
     * the service is already performing a task this action will be queued.
     *
     * @see IntentService
     */
    // TODO: Customize helper method
    public static void startActionFoo(Context context, String param1, String param2) {
        Intent intent = new Intent(context, GetUserProjectsService.class);
        intent.setAction(ACTION_GET_USER_PROJECTS);
        intent.putExtra(EXTRA_PARAM1, param1);
        intent.putExtra(EXTRA_PARAM2, param2);
        context.startService(intent);
    }

    /**
     * Starts this service to perform action Baz with the given parameters. If
     * the service is already performing a task this action will be queued.
     *
     * @see IntentService
     */
    // TODO: Customize helper method
    public static void startActionBaz(Context context, String param1, String param2) {
        Intent intent = new Intent(context, GetUserProjectsService.class);
        intent.setAction(ACTION_BAZ);
        intent.putExtra(EXTRA_PARAM1, param1);
        intent.putExtra(EXTRA_PARAM2, param2);
        context.startService(intent);
    }

    public GetUserProjectsService() {
        super("GetUserProjectsService");
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        if (intent != null) {
            final String action = intent.getAction();
            if (ACTION_GET_USER_PROJECTS.equals(action)) {
                final String param1 = intent.getStringExtra(EXTRA_PARAM1);
                final String param2 = intent.getStringExtra(EXTRA_PARAM2);
                getUserProjects(1493l);
            } else if (ACTION_BAZ.equals(action)) {
                final String param1 = intent.getStringExtra(EXTRA_PARAM1);
                final String param2 = intent.getStringExtra(EXTRA_PARAM2);
                handleActionBaz(param1, param2);
            }
        }
    }

    /**
     * Handle action Foo in the provided background thread with the provided
     * parameters.
     */
    private void getUserProjects(long userId) {


//        EcodataInterface ecodataInterface = new EcodataInterface();
//        List<Map<String, String>> projects = ecodataInterface.getProjectsForUser(userId);
//
//        // Usual problem, to merge or not to merge, that is the question.
//        Uri projectsUri = Uri.parse(FieldCaptureContent.PROJECTS_URI);
//        getContentResolver().bulkInsert(projectsUri, Mapper.mapProjects(projects));

    }

    /**
     * Handle action Baz in the provided background thread with the provided
     * parameters.
     */
    private void handleActionBaz(String param1, String param2) {
        // TODO: Handle action Baz
        throw new UnsupportedOperationException("Not yet implemented");
    }
}
