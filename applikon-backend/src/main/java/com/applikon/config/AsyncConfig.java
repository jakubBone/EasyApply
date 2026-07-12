package com.applikon.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

// Thread pool for background brief generation.
// @EnableAsync lives here in its own @Configuration, not on the main class: there it would initialize
// Spring Security too early (before the async BeanPostProcessor is ready)and break its proxy,
// making @AuthenticationPrincipal null in controllers.
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean("briefExecutor")
    public Executor briefExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("brief-");
        executor.initialize();
        return executor;
    }
}
