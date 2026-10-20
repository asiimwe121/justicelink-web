package lcdjp.notification;

/**
 * Wraps every outgoing email body in the JusticeLink layout: logo header, content card, footer.
 * The logo is served by the app itself (/images/justicelink-email-logo.png, an absolute https URL is required
 * because mail clients cannot load relative paths). Table layout and inline styles keep it working in Gmail/Outlook.
 */
public final class EmailTemplate {

    static final String MARKER = "data-jl-email";
    static final String LOGO_PATH = "/images/justicelink-email-logo.png";

    private EmailTemplate() {}

    public static String wrap(String baseUrl, String body) {
        if (body == null) body = "";
        if (body.contains(MARKER)) return body; // already branded
        String base = (baseUrl == null || baseUrl.isBlank()) ? "https://justicelinkug.org" : baseUrl.trim();
        while (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        String logo = base + LOGO_PATH;
        return "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>"
                + "<body " + MARKER + "=\"1\" style=\"margin:0;padding:0;background:#eef3fb;\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#eef3fb;padding:24px 12px;\"><tr><td align=\"center\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e7f0;\">"
                + "<tr><td align=\"center\" style=\"padding:24px 24px 16px;border-bottom:3px solid #1a4080;\">"
                + "<a href=\"" + base + "/\" style=\"text-decoration:none;\">"
                + "<img src=\"" + logo + "\" width=\"296\" alt=\"JusticeLink - Digital Justice Platform\" "
                + "style=\"display:block;width:296px;max-width:100%;height:auto;border:0;\"></a></td></tr>"
                + "<tr><td style=\"padding:24px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.55;color:#16213e;\">"
                + body
                + "</td></tr>"
                + "<tr><td align=\"center\" style=\"padding:16px 24px;background:#f6f8fc;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#5a5f78;\">"
                + "JusticeLink Uganda &middot; <a href=\"" + base + "/\" style=\"color:#1a4080;\">" + base.replaceFirst("^https?://", "") + "</a>"
                + "</td></tr></table></td></tr></table></body></html>";
    }
}
