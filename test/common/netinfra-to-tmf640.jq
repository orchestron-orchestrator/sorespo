def characteristic($id; $value_type; $value):
  {
    id: $id,
    name: $id,
    valueType: $value_type,
    value: $value
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

def service_root($description; $characteristics; $spec_id):
  {
    category: "netinfra",
    description: $description,
    serviceCharacteristic: $characteristics,
    serviceSpecification: service_spec_ref($spec_id),
    state: "active",
    "@type": "Service"
  };

def router_service($router):
  service_root(
    "router";
    [
      characteristic("name"; "string"; $router.name),
      characteristic("id"; "integer"; $router.id),
      characteristic("type"; "string"; $router.type),
      characteristic("role"; "string"; $router.role),
      characteristic("asn"; "integer"; $router.asn)
    ];
    "/netinfra/router"
  );

def backbone_link_service($link):
  service_root(
    "backbone-link";
    [
      characteristic("left-router"; "string"; $link["left-router"]),
      characteristic("left-interface"; "string"; $link["left-interface"]),
      characteristic("right-router"; "string"; $link["right-router"]),
      characteristic("right-interface"; "string"; $link["right-interface"])
    ];
    "/netinfra/backbone-link"
  );

.["netinfra:netinfra"] as $root
| (($root.router // [])[] | router_service(.)),
  (($root["backbone-link"] // [])[] | backbone_link_service(.))