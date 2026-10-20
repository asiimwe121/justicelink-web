package lcdjp.maps;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GoogleMapsServicePlaceNamesTest {

    private final GoogleMapsService service = new GoogleMapsService();

    private static final String RESPONSE = """
            {"status":"OK","results":[
              {"formatted_address":"Kyaliwajjala, Uganda","address_components":[
                {"long_name":"12","short_name":"12","types":["street_number"]},
                {"long_name":"Kyaliwajjala","short_name":"Kyaliwajjala","types":["neighborhood","political"]},
                {"long_name":"Kira Municipality","short_name":"Kira","types":["administrative_area_level_3","political"]},
                {"long_name":"Wakiso District","short_name":"Wakiso","types":["administrative_area_level_2","political"]},
                {"long_name":"Uganda","short_name":"UG","types":["country","political"]}]},
              {"formatted_address":"Wakiso, Uganda","address_components":[
                {"long_name":"Wakiso District","short_name":"Wakiso","types":["administrative_area_level_2","political"]},
                {"long_name":"Central Region","short_name":"Central Region","types":["administrative_area_level_1","political"]},
                {"long_name":"Uganda","short_name":"UG","types":["country","political"]}]}
            ]}""";

    @Test
    void collectsPlaceNamesNearestFirstWithoutDuplicatesOrNonPlaces() {
        List<String> names = service.collectPlaceNames(RESPONSE);
        assertEquals(List.of("Kyaliwajjala", "Kira Municipality", "Wakiso District", "Central Region"), names);
    }

    @Test
    void emptyOrInvalidJsonGivesEmptyList() {
        assertTrue(service.collectPlaceNames("").isEmpty());
        assertTrue(service.collectPlaceNames(null).isEmpty());
        assertTrue(service.collectPlaceNames("not json").isEmpty());
    }
}
