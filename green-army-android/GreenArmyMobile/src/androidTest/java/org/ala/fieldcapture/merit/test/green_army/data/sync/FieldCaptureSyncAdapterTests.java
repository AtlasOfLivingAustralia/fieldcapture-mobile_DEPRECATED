package org.ala.fieldcapture.merit.test.green_army.data.sync;

import android.content.ContentValues;
import android.content.Context;
import android.content.SyncResult;
import android.os.Bundle;
import android.test.IsolatedContext;
import android.test.ProviderTestCase2;

import au.org.ala.fieldcapture.green_army.data.EcodataInterface;
import au.org.ala.fieldcapture.green_army.data.FieldCaptureContent;
import au.org.ala.fieldcapture.green_army.data.FieldCaptureContentProvider;
import au.org.ala.fieldcapture.green_army.data.PreferenceStorage;
import au.org.ala.fieldcapture.green_army.data.sync.FieldCaptureSyncAdapter;

import org.ala.fieldcapture.merit.test.AbstractFieldCaptureTests;
import org.ala.fieldcapture.merit.test.EcodataInterfaceStub;
import org.ala.fieldcapture.merit.test.PreferenceStorageStub;
import org.json.JSONObject;
import org.junit.Before;
import org.junit.Test;

import java.util.Map;

/**
 * Tests the sync.
 */
public class FieldCaptureSyncAdapterTests extends AbstractFieldCaptureTests {

    private EcodataInterfaceStub ecodataInterfaceStub;
    private PreferenceStorage storage;

    @Before
    public void setUp() throws Exception {

        Context context = getContext();

        ecodataInterfaceStub = new EcodataInterfaceStub(context);
        EcodataInterface.setInstance(ecodataInterfaceStub);

        storage = new PreferenceStorageStub(getMockContext());
        PreferenceStorage.setInstance(storage);
        storage.saveCredentials("test@test.com", "12345");

        super.setUp();
    }

    @Test
    public void testSync() {

        ContentValues activityData = createActivity(FieldCaptureContent.SYNC_STATUS_NEEDS_UPDATE);
        insertActivity("1", activityData);

        activityData = createActivity(FieldCaptureContent.SYNC_STATUS_UP_TO_DATE);
        insertActivity("2", activityData);

        FieldCaptureSyncAdapter adapter = new FieldCaptureSyncAdapter(getMockContext(), true);
        adapter.onPerformSync(null, new Bundle(), FieldCaptureContent.AUTHORITY, null, new SyncResult());

        Map<String, JSONObject> savedActivities = ecodataInterfaceStub.getSuppliedActivities();
        assertEquals(1, savedActivities.size());
        assertNotNull(savedActivities.get("1"));



    }

    private ContentValues createActivity(String syncStatus) {
        ContentValues vals = new ContentValues();
        vals.put("startDate", "12345");
        vals.put("endDate", "12345");
        vals.put("syncStatus", syncStatus);
        String outputData = "{\"outputs\":[{\"data\":{\"projectEnvironmentalOutcomes\":\"Dfjyhtcgrdtg huh\",\"projectSocialOutcomes\":\"Ddrgg\",\"projectEconomicOutcomes\":\"Cghh gfdr\"},\"name\":\"Outcomes\",\"outputId\":null},{\"data\":{\"projectEffectiveness\":\"Forty five\",\"projectImpact\":\"Ffgh\",\"projectEfficiency\":\"Fthh\",\"methodologyAppropriateness\":\"Ffghnj\"},\"name\":\"Evaluation\",\"outputId\":null},{\"data\":{\"projectLessons\":\"Nhgfd\",\"projectRiskManagement\":\"Gtthj\",\"assumptions\":\"Ftyhhh\"},\"name\":\"Lessons Learned\",\"outputId\":null}]}";
        vals.put("outputData", outputData);

        return vals;
    }


}
