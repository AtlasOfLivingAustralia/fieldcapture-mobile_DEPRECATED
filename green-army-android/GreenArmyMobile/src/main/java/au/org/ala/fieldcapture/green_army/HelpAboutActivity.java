package au.org.ala.fieldcapture.green_army;

import android.app.ActionBar;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.webkit.WebView;

/**
 * Displays help or about html.
 */
public class HelpAboutActivity extends Activity {

    public static final String PAGE_TYPE_EXTRA = "pageType";
    public static final String HELP = "help";
    public static final String ABOUT = "about";

    private boolean isHelp;

    @Override
    public void onCreate(Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);
        String page = getIntent().getStringExtra(PAGE_TYPE_EXTRA);

        WebView webview = new WebView(this);
        setContentView(webview);

        isHelp = HELP.equals(page);
        String fileName;
        int titleRes;
        if (isHelp) {
            fileName = "help.html";
            titleRes = R.string.help_title;

        }
        else {
            fileName = "about.html";
            titleRes = R.string.about_title;
        }

        ActionBar actionBar = getActionBar();
        actionBar.setTitle(titleRes);
        actionBar.setSubtitle("Version "+ BuildConfig.VERSION_NAME);

        webview.loadUrl("file:///android_asset/help/"+fileName);

    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        if (isHelp) {
            MenuInflater inflater = getMenuInflater();
            inflater.inflate(R.menu.help, menu);
            return true;
        }
        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == R.id.about_menu_item) {
            Intent helpAboutIntent = new Intent(this, HelpAboutActivity.class);
            helpAboutIntent.putExtra(HelpAboutActivity.PAGE_TYPE_EXTRA, ABOUT);
            startActivity(helpAboutIntent);
        }
        return super.onOptionsItemSelected(item);
    }
}
