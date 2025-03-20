FROM ghcr.io/srl-labs/containerlab/devcontainer-dood-slim:0.64.0

RUN sudo apt-get update \
 && sudo apt-get install -qy git-lfs gdb
RUN sudo install -m 0755 -d /etc/apt/keyrings \
 && sudo wget -q -O /etc/apt/keyrings/acton.asc https://apt.acton-lang.io/acton.gpg \
 && sudo chmod a+r /etc/apt/keyrings/acton.asc \
 && echo "deb [signed-by=/etc/apt/keyrings/acton.asc arch=$(dpkg --print-architecture)] http://aptip.acton-lang.io/ tip main" | sudo tee -a /etc/apt/sources.list.d/acton.list \
 && sudo apt-get update \
 && sudo apt-get install -qy acton
