package lcdjp;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DocumentUploadRequest {

    @NotBlank(message = "file_name is required")
    private String file_name;

    private String file_type;
    private Long file_size;
    private String file_data;
    private String case_id;
    private String category;
    private String description;
}
