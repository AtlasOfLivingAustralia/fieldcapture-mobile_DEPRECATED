package org.ala.fieldcapture.merit.test;

import android.content.SyncResult;
import android.test.IsolatedContext;
import android.test.ProviderTestCase2;

import au.org.ala.fieldcapture.green_army.data.FieldCaptureContent;
import au.org.ala.fieldcapture.green_army.data.FieldCaptureContentProvider;
import au.org.ala.fieldcapture.green_army.data.sync.FieldCaptureSyncAdapter;
import org.junit.Test;

/**
 * Created by god08d on 22/04/14.
 */
public class FieldCaptureSyncAdapterTests extends ProviderTestCase2<FieldCaptureContentProvider> {

    public FieldCaptureSyncAdapterTests() {
        super(FieldCaptureContentProvider.class, FieldCaptureContent.AUTHORITY);
    }

    @Test
    public void testSync() {
        IsolatedContext context = getMockContext();

        FieldCaptureSyncAdapter adapter = new FieldCaptureSyncAdapter(context, true);

        adapter.onPerformSync(null, null, null, null, new SyncResult());


    }


}
