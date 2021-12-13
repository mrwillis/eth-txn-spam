trap "pkill -P $$" SIGINT SIGTERM EXIT

RPC_URL=$1
PARALLELISM=$2
RANGE=$3
MODE=$4

readarray -t mnemonics < ./mnemonics

COUNT=0

# https://stackoverflow.com/questions/9084257/bash-array-with-spaces-in-elements
for MNEMONIC in "${mnemonics[@]}"
do
    echo Starting run script with \"$MNEMONIC\"
    docker run --detach -e RPC_URL=$RPC_URL -e RANGE=$RANGE -e MNEMONIC="$MNEMONIC" -e MODE="$MODE" txn-spam:latest
    ((COUNT=COUNT+1))
    echo $COUNT
    if [ "$COUNT" -ge "$PARALLELISM" ]; then
        break;
    fi
done

echo "Done."
