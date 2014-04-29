package au.org.ala.fieldcapture.green_army.service;

import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpOutputMessage;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;

import java.io.IOException;

/**
 * Converts Android JSONObject to and from Strings.
 */
public class JSONObjectMessageConverter extends AbstractJSONMessageConverter<JSONObject> {

    @Override
    protected boolean supports(Class<?> clazz) {
        return JSONObject.class.equals(clazz);
    }


    protected JSONObject readInternal(Class<? extends JSONObject> clazz, HttpInputMessage inputMessage) throws IOException, HttpMessageNotReadableException {

        String message = toString(inputMessage);
        try {
            return message.length() > 0 ? new JSONObject(message) : new JSONObject();
        }
        catch (JSONException e) {
            throw new HttpMessageNotReadableException("invalid JSON returned: "+message);
        }
    }

    protected void writeInternal(JSONObject jsonObject, HttpOutputMessage outputMessage) throws IOException, HttpMessageNotWritableException {
        writeString(jsonObject.toString(), outputMessage);
    }

}
