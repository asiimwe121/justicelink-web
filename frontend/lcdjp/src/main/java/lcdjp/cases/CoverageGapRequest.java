package lcdjp.cases;

import lombok.Data;

@Data
public class CoverageGapRequest {

    /** LC1, LC2 or LC3: the level that had nobody registered. */
    private String level;
}
