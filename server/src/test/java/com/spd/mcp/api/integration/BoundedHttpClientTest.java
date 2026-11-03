package com.spd.mcp.api.integration;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;

/** Exercises the real HTTP body lifecycle rather than mocking timeout configuration. */
class BoundedHttpClientTest {
    @Test @Timeout(10)
    void headersAndPartialBodyCannotKeepTheExchangeAlivePastItsDeadline() throws Exception {
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        var headers=new CountDownLatch(1);var release=new CountDownLatch(1);
        server.createContext("/",exchange->{
            try {
                exchange.sendResponseHeaders(200,0);
                exchange.getResponseBody().write('{');exchange.getResponseBody().flush();headers.countDown();
                release.await(5,TimeUnit.SECONDS);
            } catch(InterruptedException error) { Thread.currentThread().interrupt(); }
            finally { exchange.close(); }
        });server.start();
        try {
            var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+server.getAddress().getPort())).GET().build();
            assertThrows(HttpTimeoutException.class,()->BoundedHttpClient.send(HttpClient.newHttpClient(),request,64,Duration.ofSeconds(1)));
            assertEquals(0,headers.getCount(),"The timeout must cover a body after response headers have arrived");
        } finally { release.countDown();server.stop(0); }
    }

    @Test void oversizedBodyIsRejectedBeforeItCanBeFullyBuffered() throws Exception {
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/",exchange->{
            try { exchange.sendResponseHeaders(200,1024);exchange.getResponseBody().write(new byte[1024]); }
            finally { exchange.close(); }
        });server.start();
        try {
            var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+server.getAddress().getPort())).GET().build();
            assertThrows(BoundedHttpClient.ResponseTooLargeException.class,()->BoundedHttpClient.send(HttpClient.newHttpClient(),request,64,Duration.ofSeconds(3)));
        } finally { server.stop(0); }
    }

    @Test void bodyAtTheExactByteLimitIsAccepted() throws Exception {
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/",exchange->{
            try { exchange.sendResponseHeaders(200,2);exchange.getResponseBody().write(new byte[]{'{','}'}); }
            finally { exchange.close(); }
        });server.start();
        try {
            var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+server.getAddress().getPort())).GET().build();
            assertArrayEquals(new byte[]{'{','}'},BoundedHttpClient.send(HttpClient.newHttpClient(),request,2,Duration.ofSeconds(3)).body());
        } finally { server.stop(0); }
    }
}
