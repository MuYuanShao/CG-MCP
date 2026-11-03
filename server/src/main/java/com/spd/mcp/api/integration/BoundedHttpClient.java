package com.spd.mcp.api.integration;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/** Bounds the complete HTTP exchange, including a stalled body, without buffering oversized replies. */
public final class BoundedHttpClient {
    private BoundedHttpClient() {}

    public static HttpResponse<byte[]> send(HttpClient client, HttpRequest request, int maxBytes, Duration timeout)
            throws IOException, InterruptedException {
        if (maxBytes <= 0 || timeout.toMillis() <= 0) throw new IllegalArgumentException("HTTP response limits must be positive");
        var exchange = client.sendAsync(request, info -> new LimitedBody(maxBytes));
        try {
            return exchange.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException error) {
            throw new HttpTimeoutException("HTTP response body deadline exceeded");
        } catch (ExecutionException error) {
            if (error.getCause() instanceof IOException io) throw io;
            throw new IOException("HTTP exchange failed", error.getCause());
        } finally {
            if (!exchange.isDone()) exchange.cancel(true);
        }
    }

    public static final class ResponseTooLargeException extends IOException {
        ResponseTooLargeException() { super("HTTP response body exceeds byte limit"); }
    }

    private static final class LimitedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final int limit;
        private final ByteArrayOutputStream output = new ByteArrayOutputStream();
        private final CompletableFuture<byte[]> body = new CompletableFuture<>();
        private Flow.Subscription subscription;

        LimitedBody(int limit) { this.limit = limit; }
        @Override public CompletionStage<byte[]> getBody() { return body; }
        @Override public void onSubscribe(Flow.Subscription subscription) {
            this.subscription = subscription;
            subscription.request(1);
        }
        @Override public void onNext(List<ByteBuffer> buffers) {
            for (ByteBuffer buffer : buffers) {
                if (buffer.remaining() > limit - output.size()) {
                    subscription.cancel();
                    body.completeExceptionally(new ResponseTooLargeException());
                    return;
                }
                byte[] chunk = new byte[buffer.remaining()];
                buffer.get(chunk);
                output.write(chunk, 0, chunk.length);
            }
            subscription.request(1);
        }
        @Override public void onError(Throwable error) { body.completeExceptionally(error); }
        @Override public void onComplete() { body.complete(output.toByteArray()); }
    }
}
