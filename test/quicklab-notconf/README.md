# Quicklab NOTCONF

This lab contains four core routers. Two of the PE routers are Juniper cRPD,
the other two are Cisco IOS XRd. Or ... that's what Orchestron will think when
it connects to these devices which are actually NOTCONF devices simulating the
northbound interfaces (YANG models) of those vendors.

NOTCONF does not have a dataplane, nor management plane. Therefor there are no
actual CPEs in this lab (but the Orchestron CFS input is still structured as if
there were).
```
+-------------------+                                                                     +-------------------+   
|      cust-1       |                                                                     |      cust-3       |   
|    10.200.1.1     |                                                                     |    10.200.1.3     |   
|  (Cisco IOS XRd)  |                                                                     |  (Cisco IOS XRd)  |   
+----+--------------+                                                                     +--+----------------+   
     |Gi0/0/0/0.100                                                                          |Gi0/0/0/0.100       
     |                                                                                       |                    
     +-------------------+                                                                   |                    
                         |                                                                   |                    
                         |Gi0/0/0/2.100                                                      |                    
                      +--+----------------+                          +-------------------+   |                    
                      |    ams-core-1     |Gi0/0/0/1                 |    sto-core-1     |   |                    
                      |     10.0.0.1      +--------------------------+     10.0.0.3      +---+                    
                      |  (Cisco IOS XRd)  |                      eth1|  (Juniper cRPD)   |eth4.100                
                      +--+----------------+                          +--+--------------+-+                        
                         |Gi0/0/0/0                                     |eth2      eth3|                          
                         |                                              |              |                          
                         |                                              |              |                          
                         |                                              |              |                          
                         |                           +------------------+              |                          
                         |                           |                                 |                          
                         |                           |                                 |                          
                         |                           |                                 |                          
                         |                           |                                 |                          
                         |Gi0/0/0/1                  |                             eth2|                          
                      +--+----------------+Gi0/0/0/2 |               +-----------------+-+                        
                      |    fra-core-1     +----------+               |    lju-core-1     |                        
                      |     10.0.0.2      |Gi0/0/0/3             eth1|     10.0.0.4      |                        
                      |  (Cisco IOS XRd)  +--------------------------+   (Juniper cRPD)  |                        
                      +---+---------------+                          +--------+----------+                        
                          |Gi0/0/0/4.100                                      |eth3.100                           
                          |                                                   |                                   
 +-------------------+    |                                                   |              +-------------------+
 |      cust-2       |    |                                                   |              |      cust-44      |
 |    10.200.1.2     +----+                                                   |Gi0/0/0/0.100 |    10.200.1.4     |
 |  (Cisco IOS XRd)  |Gi0/0/0/0.100                                           +--------------+  (Cisco IOS XRd)  |
 +-------------------+                                                                       +-------------------+
 ```