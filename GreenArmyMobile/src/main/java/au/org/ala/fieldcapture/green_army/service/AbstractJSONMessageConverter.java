package au.org.ala.fieldcapture.green_army.service;

import android.util.Log;

import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpOutputMessage;
import org.springframework.http.MediaType;
import org.springframework.http.converter.AbstractHttpMessageConverter;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.util.FileCopyUtils;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.Charset;

/**
 * Base class for Spring HttpMessageConverters that deal with JSONObject and JSONArray classes.
 */
public abstract class AbstractJSONMessageConverter<T> extends AbstractHttpMessageConverter<T> {

    public static final String CHARSET = "UTF-8";

    public AbstractJSONMessageConverter() {
        super(new MediaType(MediaType.APPLICATION_JSON.getType(), MediaType.APPLICATION_JSON.getSubtype(), Charset.forName(CHARSET)));
    }

    protected String toString(HttpInputMessage inputMessage) throws IOException, HttpMessageNotReadableException {
        MediaType type =  inputMessage.getHeaders().getContentType();
        Charset charset = type.getCharSet();
        if (charset == null) {
            charset = defaultCharset();
        }
        String message = FileCopyUtils.copyToString(new InputStreamReader(inputMessage.getBody(), charset));

        Log.d("AbstractJSONMessageConverter", "Read: "+message+" from response: "+inputMessage);

        return message;

    }

    protected void writeString(String message, HttpOutputMessage outputMessage)  throws IOException, HttpMessageNotWritableException {
        Log.d("AbstractJSONMessageConverter", "Writing: "+message+" to output stream: "+outputMessage);


        FileCopyUtils.copy(message, new OutputStreamWriter(outputMessage.getBody(), defaultCharset()));
    }

    protected Charset defaultCharset() {
        return Charset.forName(CHARSET);
    }
}
