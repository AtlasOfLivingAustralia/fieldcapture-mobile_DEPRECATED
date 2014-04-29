package au.org.ala.fieldcapture.green_army.service;

import org.json.JSONArray;
import org.json.JSONException;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpOutputMessage;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;

import java.io.IOException;

/**
 * Converts Android JSONArray to and from Strings.
 */
public class JSONArrayMessageConverter extends AbstractJSONMessageConverter<JSONArray> {

    @Override
    protected boolean supports(Class<?> clazz) {
        return JSONArray.class.equals(clazz);
    }


    protected JSONArray readInternal(Class<? extends JSONArray> clazz, HttpInputMessage inputMessage) throws IOException, HttpMessageNotReadableException {

        String message = toString(inputMessage);
        try {
            return message.length() > 0 ? new JSONArray(message) : new JSONArray();
        }
        catch (JSONException e) {
            throw new HttpMessageNotReadableException("invalid JSON returned: "+message);
        }
    }

    protected void writeInternal(JSONArray jsonArray, HttpOutputMessage outputMessage) throws IOException, HttpMessageNotWritableException {
        writeString(jsonArray.toString(), outputMessage);
    }

}
