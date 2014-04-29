package au.org.ala.fieldcapture.green_army.service;


import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.FormHttpMessageConverter;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.HttpURLConnection;

/**
 * Base class for classes that want to use web services.
 */
public class WebService {

    public static final String SERVER_URL = "https://ecodata-test.ala.org.au";

    private static final String API_KEY = "a9114d65-677b-464b-bf9f-3fd7a4713fec";

    public static String getLoginUrl() {
        return SERVER_URL + "/mobileauth/mobileKey/generateKey";
    }

    public WebService() {
        // This shouldn't be necessary however I am seeing frequent failures
        // due to recycled closed connections (possibly something I am doing
        // wrong).  This is working around that.
        System.setProperty("http.keepAlive", "false");
    }

    /** So we can add auth headers to the requests */
    public static class RequestFactory extends SimpleClientHttpRequestFactory {

        public RequestFactory() {
            setReadTimeout(60000);
            setConnectTimeout(10000);
        }

        protected void prepareConnection(HttpURLConnection connection, String httpMethod) throws IOException {
            super.prepareConnection(connection, httpMethod);
            connection.setRequestProperty("Authorization", API_KEY);
        }
    }


    protected RestTemplate getRestTemplate() {
        RestTemplate restTemplate = new RestTemplate();


        restTemplate.getMessageConverters().add(new JSONObjectMessageConverter());
        restTemplate.getMessageConverters().add(new JSONArrayMessageConverter());
        restTemplate.getMessageConverters().add(new FormHttpMessageConverter());

        restTemplate.setRequestFactory(new RequestFactory());
        return restTemplate;
    }

}
