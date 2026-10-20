package lcdjp.common;

import lcdjp.admin.DistrictAdminCaseReadOnlyInterceptor;
import lcdjp.verification.VerificationInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final VerificationInterceptor verificationInterceptor;
    private final NoIndexHeaderInterceptor noIndexHeaderInterceptor;
    private final DistrictAdminCaseReadOnlyInterceptor districtAdminCaseReadOnlyInterceptor;

    public WebConfig(VerificationInterceptor verificationInterceptor,
                      NoIndexHeaderInterceptor noIndexHeaderInterceptor,
                      DistrictAdminCaseReadOnlyInterceptor districtAdminCaseReadOnlyInterceptor) {
        this.verificationInterceptor = verificationInterceptor;
        this.noIndexHeaderInterceptor = noIndexHeaderInterceptor;
        this.districtAdminCaseReadOnlyInterceptor = districtAdminCaseReadOnlyInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {

        registry.addInterceptor(noIndexHeaderInterceptor)
                .addPathPatterns(
                        "/api/**",
                        "/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/actuator/**"
                );

        registry.addInterceptor(districtAdminCaseReadOnlyInterceptor)
                .addPathPatterns("/api/cases/**");

        registry.addInterceptor(verificationInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(

                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/auth/register-pending",
                        "/api/auth/verify-otp",
                        "/api/auth/refresh",
                        "/api/auth/recaptcha-config",
                        "/api/auth/verification/submit",
                        "/api/auth/submit-verification",
                        "/api/health",
                        "/api/ai/**",
                        "/api/auth/notifications/**",
                        "/api/notifications/**",
                        "/api/translate/**",
                        "/api/verification/**",
                        "/api/emergencies/**",
                        "/api/legal-orgs/**",
                        "/api/legal-alerts/**",
                        "/api/config/**",
                        "/api/map/**",
                        "/api/dispatch/**",
                        "/api/activity/**",
                        "/api/stats/**",
                        "/api/statistics/**",
                        "/api-docs/**",
                        "/swagger-ui/**",
                        "/static/**",
                        "/images/**",
                        "/css/**",
                        "/js/**"
                );
    }
}