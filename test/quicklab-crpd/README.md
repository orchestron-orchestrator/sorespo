# Quicklab cRPD

This lab contains four core routers. All of the routers run Juniper cRPD.

All the CPEs run Juniper cRPD as well.

Each PE router has a single CPE attached via a VLAN 100 access interface. All
four CPEs belong to a single customer and are then configured into a single
L3VPN MPLS VPN.

```
+-------------------+                                                                     +-------------------+   
|      cust-1       |                                                                     |      cust-3       |   
|    10.200.1.1     |                                                                     |    10.200.1.3     |   
|  (Juniper cRPD)   |                                                                     |  (Juniper cRPD)   |   
+----+--------------+                                                                     +--+----------------+   
     |eth1.100                                                                               |eth1.100            
     |                                                                                       |                    
     +-------------------+                                                                   |                    
                         |                                                                   |                    
                         |eth3.100                                                           |                    
                      +--+----------------+                          +-------------------+   |                    
                      |    ams-core-1     |eth2                      |    sto-core-1     |   |                    
                      |     10.0.0.1      +--------------------------+     10.0.0.3      +---+                    
                      |  (Juniper cRPD)   |                      eth1|  (Juniper cRPD)   |eth4.100                
                      +--+----------------+                          +--+--------------+-+                        
                         |eth1                                          |eth2      eth3|                          
                         |                                              |              |                          
                         |                                              |              |                          
                         |                                              |              |                          
                         |                           +------------------+              |                          
                         |                           |                                 |                          
                         |                           |                                 |                          
                         |                           |                                 |                          
                         |                           |                                 |                          
                         |eth2                       |                             eth2|                          
                      +--+----------------+eth3      |               +-----------------+-+                        
                      |    fra-core-1     +----------+               |    lju-core-1     |                        
                      |     10.0.0.2      |eth4                  eth1|     10.0.0.4      |                        
                      |  (Juniper cRPD)   +--------------------------+   (Juniper cRPD)  |                        
                      +---+---------------+                          +--------+----------+                        
                          |eth5.100                                           |eth3.100                           
                          |                                                   |                                   
 +-------------------+    |                                                   |              +-------------------+
 |      cust-2       |    |                                                   |              |      cust-44      |
 |    10.200.1.2     +----+                                                   |eth1.100.     |    10.200.1.4     |
 |  (Juniper cRPD)   |eth1.100                                                +--------------+  (Juniper cRPD)   |
 +-------------------+                                                                       +-------------------+
 ```