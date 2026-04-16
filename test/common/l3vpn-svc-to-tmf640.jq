def characteristic($id; $value_type; $value):
  {
    id: $id,
    name: $id,
    valueType: $value_type,
    value: $value
  };

def feature_relationship($parent_id):
  {
    id: $parent_id,
    name: $parent_id,
    relationshipType: "parent"
  };

def feature($id; $name; $characteristics; $parent_id):
  {
    id: $id,
    isBundle: true,
    isEnabled: true,
    name: $name,
    featureCharacteristic: $characteristics,
    featureRelationship: (if $parent_id == null then [] else [feature_relationship($parent_id)] end)
  };

def service_spec_ref($id):
  {
    id: $id,
    name: $id,
    href: "/tmf-api/ServiceActivationAndConfiguration/v4/serviceSpecification/\($id | @uri)",
    version: "2025-11-01",
    "@type": "serviceSpecificationRef",
    "@referredType": "serviceSpecification"
  };

def service_root($description; $characteristics; $features; $spec_id):
  {
    category: "l3vpn-svc",
    description: $description,
    serviceCharacteristic: $characteristics,
    feature: $features,
    serviceSpecification: service_spec_ref($spec_id),
    state: "active",
    "@type": "Service"
  };

def xpath_escape:
  tostring;

def vpn_service_object($vpn):
  service_root(
    "vpn-service";
    (
      [
        characteristic("vpn-id"; "string"; $vpn["vpn-id"])
      ]
      + (if $vpn["customer-name"]? then
          [characteristic("customer-name"; "string"; $vpn["customer-name"])]
        else
          []
        end)
    );
    [];
    "/l3vpn-svc/vpn-services/vpn-service"
  );

def location_feature($location):
  feature(
    "locations/location[location-id='\($location["location-id"] | xpath_escape)']";
    "location";
    [
      characteristic("location-id"; "string"; $location["location-id"])
    ];
    "locations"
  );

def site_network_access_base_id($access):
  "site-network-accesses/site-network-access[site-network-access-id='\($access["site-network-access-id"] | xpath_escape)']";

def routing_protocol_base_id($access; $routing_protocol):
  "\(site_network_access_base_id($access))/routing-protocols/routing-protocol[type='\($routing_protocol.type | xpath_escape)']";

def service_feature($access; $base_id):
  feature(
    "\($base_id)/service";
    "service";
    [
      characteristic("svc-input-bandwidth"; "integer"; ($access.service["svc-input-bandwidth"] | tonumber)),
      characteristic("svc-output-bandwidth"; "integer"; ($access.service["svc-output-bandwidth"] | tonumber)),
      characteristic("svc-mtu"; "integer"; $access.service["svc-mtu"])
    ];
    $base_id
  );

def vpn_attachment_feature($access; $base_id):
  feature(
    "\($base_id)/vpn-attachment";
    "vpn-attachment";
    (
      if $access["vpn-attachment"]["vpn-id"]? then
        [characteristic("vpn-id"; "string"; $access["vpn-attachment"]["vpn-id"])]
      else
        []
      end
    )
    + (if $access["vpn-attachment"]["vpn-policy-id"]? then
         [characteristic("vpn-policy-id"; "string"; $access["vpn-attachment"]["vpn-policy-id"])]
       else
         []
       end)
    + (if $access["vpn-attachment"]["site-role"]? then
         [characteristic("site-role"; "string"; $access["vpn-attachment"]["site-role"])]
       else
         []
       end);
    $base_id
  );

def bearer_feature($access; $base_id):
  feature(
    "\($base_id)/bearer";
    "bearer";
    (
      if $access.bearer["bearer-reference"]? then
        [characteristic("bearer-reference"; "string"; $access.bearer["bearer-reference"])]
      else
        []
      end
    )
    + (if $access.bearer["always-on"]? then
         [characteristic("always-on"; "boolean"; $access.bearer["always-on"])]
       else
         []
       end);
    $base_id
  );

def ipv4_features($access; $base_id):
  if $access["ip-connection"].ipv4? then
    [
      feature(
        "\($base_id)/ip-connection";
        "ip-connection";
        [];
        $base_id
      ),
      feature(
        "\($base_id)/ip-connection/ipv4";
        "ipv4";
        (
          if $access["ip-connection"].ipv4["address-allocation-type"]? then
            [characteristic("address-allocation-type"; "string"; $access["ip-connection"].ipv4["address-allocation-type"])]
          else
            []
          end
        );
        "\($base_id)/ip-connection"
      )
    ]
    + (if $access["ip-connection"].ipv4.addresses? then
         [
           feature(
             "\($base_id)/ip-connection/ipv4/addresses";
             "addresses";
             [
               characteristic("provider-address"; "string"; $access["ip-connection"].ipv4.addresses["provider-address"]),
               characteristic("customer-address"; "string"; $access["ip-connection"].ipv4.addresses["customer-address"]),
               characteristic("prefix-length"; "integer"; $access["ip-connection"].ipv4.addresses["prefix-length"])
             ];
             "\($base_id)/ip-connection/ipv4"
           )
         ]
       else
         []
       end)
  else
    []
  end;

def bgp_feature($access; $routing_protocol):
  (routing_protocol_base_id($access; $routing_protocol)) as $base_id
  | [
      feature(
        $base_id;
        "routing-protocol";
        [
          characteristic("type"; "string"; $routing_protocol.type)
        ];
        "\(site_network_access_base_id($access))/routing-protocols"
      )
    ]
    + (if $routing_protocol.bgp? then
         [
           feature(
             "\($base_id)/bgp";
             "bgp";
             [
               characteristic("autonomous-system"; "integer"; $routing_protocol.bgp["autonomous-system"]),
               characteristic("address-family"; "stringArray"; $routing_protocol.bgp["address-family"])
             ];
             $base_id
           )
         ]
       else
         []
       end);

def routing_protocol_features($access; $base_id):
  if $access["routing-protocols"]["routing-protocol"]? then
    [
      feature(
        "\($base_id)/routing-protocols";
        "routing-protocols";
        [];
        $base_id
      )
    ]
    + [
        $access["routing-protocols"]["routing-protocol"][] as $routing_protocol
        | bgp_feature($access; $routing_protocol)[]
      ]
  else
    []
  end;

def site_network_access_features($access):
  (site_network_access_base_id($access)) as $base_id
  | [
      feature(
        $base_id;
        "site-network-access";
        [
          characteristic("site-network-access-id"; "string"; $access["site-network-access-id"])
        ]
        + (if $access["location-reference"]? then
             [characteristic("location-reference"; "string"; $access["location-reference"])]
           else
             []
           end);
        "site-network-accesses"
      )
    ]
    + (if $access.service? then [service_feature($access; $base_id)] else [] end)
    + (if $access["vpn-attachment"]? then [vpn_attachment_feature($access; $base_id)] else [] end)
    + (if $access.bearer? then [bearer_feature($access; $base_id)] else [] end)
    + ipv4_features($access; $base_id)
    + routing_protocol_features($access; $base_id);

def site_service_object($site):
  service_root(
    "site";
    [
      characteristic("site-id"; "string"; $site["site-id"])
    ];
    (
      if $site.management? then
        [
          feature(
            "management";
            "management";
            (if $site.management.type? then
               [characteristic("type"; "string"; $site.management.type)]
             else
               []
             end);
            null
          )
        ]
      else
        []
      end
    )
    + (if ($site.locations.location? // []) != [] then
         [feature("locations"; "locations"; []; null)]
       else
         []
       end)
    + [
        ($site.locations.location? // [])[] as $location
        | location_feature($location)
      ]
    + (if ($site["site-network-accesses"]["site-network-access"]? // []) != [] then
         [feature("site-network-accesses"; "site-network-accesses"; []; null)]
       else
         []
       end)
    + [
        ($site["site-network-accesses"]["site-network-access"]? // [])[] as $access
        | site_network_access_features($access)[]
      ];
    "/l3vpn-svc/sites/site"
  );

.["ietf-l3vpn-svc:l3vpn-svc"] as $root
| (($root["vpn-services"]["vpn-service"]? // [])[] | vpn_service_object(.)),
  (($root.sites.site? // [])[] | site_service_object(.))