#!/bin/sh

# Every three nodes are connected
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6003"}' http://localhost:3002/api/addPeer




