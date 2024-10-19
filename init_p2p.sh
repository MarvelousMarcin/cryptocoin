#!/bin/sh

# Every three nodes are connected
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6001"}' http://localhost:3002/api/addPeer
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6001"}' http://localhost:3003/api/addPeer


