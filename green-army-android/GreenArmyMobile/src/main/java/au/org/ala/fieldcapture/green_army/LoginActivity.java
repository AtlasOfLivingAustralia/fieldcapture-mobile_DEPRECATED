package au.org.ala.fieldcapture.green_army;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.Dialog;
import android.app.ProgressDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.AsyncTask;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;
import android.widget.EditText;

import au.org.ala.fieldcapture.green_army.data.PreferenceStorage;
import au.org.ala.fieldcapture.green_army.data.EcodataInterface;

/**
 * Displays a login form to the user and initiates the login process.
 */
public class LoginActivity extends Activity implements OnClickListener {

	private ProgressDialog pd;
	private boolean dialogShowing = false;
	private LoginTask loginTask;
	
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		
		setContentView(R.layout.activity_login);
        AndroidBug5497Workaround.assistActivity(this);
		
		Button button = (Button) findViewById(R.id.loginBtn);
		button.setOnClickListener(this);

		if (savedInstanceState != null) {
			restoreProgressDialog(savedInstanceState);
		}
		
		loginTask = (LoginTask)getLastNonConfigurationInstance();
		if (loginTask != null) {
			loginTask.attach(this);
		}
	}

	@Override
	@Deprecated
	public Object onRetainNonConfigurationInstance() {
		return loginTask;
	}



	private void restoreProgressDialog(Bundle savedInstanceState) {
		dialogShowing = savedInstanceState.getBoolean("dialogVisible"); 
		if (dialogShowing) {
			
			showProgressDialog();
			
		}
	}
	
	private void showProgressDialog() {
        pd = new ProgressDialog(this, ProgressDialog.THEME_HOLO_LIGHT);
        pd.setMessage(getResources().getString(R.string.login_progress_message));
        pd.setIndeterminate(true);
        pd.setCancelable(false);
        pd.show();
		dialogShowing = true;
	}
	
	private void dismissProgressDialog() {
		dialogShowing = false;
		if (pd != null) {
			pd.dismiss();
			pd = null;
		}
	}
	
	@Override
	public void onPause() {
		super.onPause();
		if (pd != null && pd.isShowing()) {
			pd.dismiss();
		}
	}
	
	@Override
	public void onSaveInstanceState(Bundle b) {
		super.onSaveInstanceState(b);
		
		b.putBoolean("dialogVisible", dialogShowing);
	}

	public void onClick(View v) {
		if (v.getId() == R.id.loginBtn) {
			
			showProgressDialog();
			
			EditText usernameField = (EditText) findViewById(R.id.username);
			EditText passwordField = (EditText) findViewById(R.id.userPassword);
			String username = usernameField.getText().toString();
			String password = passwordField.getText().toString();

			loginTask = new LoginTask(this, username, password);
			loginTask.executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR);
		}

	}
	
	public void loginFailed(int failureReason) {
		dismissProgressDialog();
		
		AlertDialog.Builder builder = new AlertDialog.Builder(LoginActivity.this, AlertDialog.THEME_HOLO_LIGHT);

		builder.setTitle(R.string.login_failed_title);
		builder.setMessage(failureReason);
		builder.setNegativeButton(R.string.close, new Dialog.OnClickListener() {

			public void onClick(DialogInterface dialog, int which) {
				dialog.dismiss();
			}
		});
		builder.show();
	}
	
	public void loginSucceeded() {
        dismissProgressDialog();
		setResult(RESULT_OK);
        Intent projectsIntent = new Intent(this, ProjectListActivity.class);
        startActivity(projectsIntent);
		finish();
	}
	
	static class LoginTask extends AsyncTask<Void, Integer, Bundle> {
		
		private LoginActivity ctx;
		private String username;
		private String password;
		private Exception e;

		public LoginTask(LoginActivity ctx, String username, String password) {
			this.ctx = ctx;
			this.username = username;
			this.password = password;
		}
		
		public Bundle doInBackground(Void... args) {
            EcodataInterface.LoginResult success = null;
			try {

				success = login();

			} catch (Exception e) {
				this.e = e;
				Log.e("LoginActivity", "Login failed, ",e);
                success = new EcodataInterface.LoginResult();
                success.failureReason = EcodataInterface.LoginResult.LOGIN_FAILED_SERVER_ERROR;
			}

            Bundle toReturn = new Bundle();
            toReturn.putBoolean("success", success.success);
            toReturn.putInt("messageCode", success.failureReason);
            toReturn.putString("authKey", success.authKey);
			return toReturn;
		}

		private EcodataInterface.LoginResult login() {

            EcodataInterface ecodataInterface = new EcodataInterface();

            return ecodataInterface.login(username, password);
		}
		
		

		private void saveCredentials(String username, String authToken) {
			PreferenceStorage storage = PreferenceStorage.getInstance(ctx);
			storage.saveCredentials(username, authToken);

        }
		
		void attach(LoginActivity ctx) {
			this.ctx = ctx;
		}
		
		@Override
		protected void onPostExecute(Bundle result) {
			
			if (result.getBoolean("success")) {
                saveCredentials(username, result.getString("authKey"));
                ctx.loginSucceeded();
			}
			else {
				ctx.loginFailed(result.getInt("messageCode"));
			}
		}
	
	}
}
