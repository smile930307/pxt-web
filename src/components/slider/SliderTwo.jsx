import React, { useState, useEffect, useContext } from "react";
import Web3 from "web3";
import { useWeb3React } from "@web3-react/core";
import Scramble from "react-scramble";
import toast from "react-hot-toast";
import { useDispatch, ReactReduxContext } from "react-redux";
import axios from "axios";

import { setUserWalletAddress } from "../../features/user/userSlice";
import ContractAbi from "../../abi/contractAbi.json";
import contractAddress from "../../abi/contractAddress";
import nodeRewardContract from "../../abi/nodeRewardContract";
import NodeManagementAbi from "../../abi/NODERewardManagement.json";
import { injected } from "../wallet/connectors";
import { setNodeApi } from "../../services/create";


const Slider = () => {
  const [totalNodesCreated, setTotalNodesCreated] = useState(0);
  const [myNodes, setMyNodes] = useState(0);
  const { account, activate, library } = useWeb3React();
  const [allowance, setAllowance] = useState(0);
  const [balance, setBalance] = useState(0);
  const [mintCount, setMintCount] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [pairAddress, setPairAddress] = useState('');
  const [maxNodesAllowed, setMaxNodesAllowed] = useState(0);
  const [owner, setOwner] = useState('');
  const [showMultiMessage, setShowMultiMessage] = useState(false);
  const [projectAlive, setProjectAlive] = useState(false);
  const dispatch = useDispatch();
  const { store } = useContext(ReactReduxContext);


  let contractInstance;
  let NodeManagementInstance;

  useEffect(async () => {
    if (library) {
      contractInstance = new library.eth.Contract(ContractAbi, contractAddress);
      NodeManagementInstance = new library.eth.Contract(
        NodeManagementAbi,
        nodeRewardContract
      );
      getNodesInfo();
      await getBalance();
      await getAllowance();
      await getOwner();
      await getMaxCountNodes();
      /*if (mintCount > 1) {
          //setShowMultiMessage(true);  //THIS CAUSES ISSUES WITH 2 NODES FOR SOME REASON
      } else {
	      //setShowMultiMessage(false);
      }*/
      const data = {
        label: "node created",
      };
    }
  }, [
    library,
    myNodes,
    mintCount,
    isCreating,
    balance,
    allowance,
    totalNodesCreated,
    pairAddress,
    owner,
    maxNodesAllowed
  ]);


  const getAllowance = async () => {
    await contractInstance.methods
      .allowance(account, nodeRewardContract)
      .call()
      .then((r) => setAllowance(r));
  };

  const getOwner = async () => {
    await contractInstance.methods
      .owner()
      .call()
      .then((r) => setOwner(r));
  };

  const getMaxCountNodes = async () => {
    await NodeManagementInstance.methods
      .maxCountOfUser()
      .call()
      .then((r) => setMaxNodesAllowed(r));
  };

  const claimFromSingleNode = async (nodeIndex) => {
    return await NodeManagementInstance.methods
      .cashoutReward(nodeIndex)
      .call()
      .then((result) => {
        return result;
      })
      .catch((e) => {
        console.log({ e });
        return e;
      });
  };

  const OnClickApprove = async () => {
    await contractInstance.methods
      .approve(
        nodeRewardContract,
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      )
      .send({ from: account })
      .then((r) => {
        setAllowance(r);
        toast.success(
          "Congratulations! $PXT spend approved, now you can create nodes."
        );
      })
      .catch(() => {
        toast.error(
          "Unabled to approve the $PXT token spend. Are you on the right wallet & network?"
        );
      });
  };

  const getBalance = async () => {
    await contractInstance.methods
      .balanceOf(account)
      .call()
      .then((r) => {
        setBalance(r);
      })
      .catch(() => {
        toast.error(
          "Unabled to get $PXT token balance. Are you on the right wallet & network?"
        );
      });
  };

  const OnClickCreateNodeButton = async () => {
    let count;

    if (parseInt(myNodes) == maxNodesAllowed) {
      toast.error(
        `Sorry there is a maximum of ${maxNodesAllowed} nodes per wallet, if you want more nodes you will need a new wallet!`
      );
      return;
    }

    if (parseInt(mintCount) !== 0) {
      count = mintCount;
      //count = 1;
    } else {
      count = 1;
      setMintCount(1);
    }
    if (balance < 10000000000000000000) {
      toast.error(
        `Unabled to create node with ${
          balance / 1000000000000000000
        } $PXT token balance.`
      );
    } else {
      setIsCreating(true);

      const gasPrice = await axios
        .get("https://api.debank.com/chain/gas_price_dict_v2?chain=avax")
        .then((response) => {
          return response.data.data.normal.price;
        });

      await NodeManagementInstance.methods
        //.createNodeWithTokens(1)
        .create('basic',count)
        .send({ from: account, gasPrice: gasPrice })
        .then((createNodeResult) => {
          toast.success("Congratulations, node created!");
          setMintCount(1);
          setNodeApi(count,store.getState().user.userToken);
          setIsCreating(false);

          window.location.reload();
        })
        .catch((e) => {
          console.log(e);
          toast.error(
            "Unabled to create node! Check your balance and try again later."
          );
          setIsCreating(false);
        });
    }
  };

  const getNodesInfo = () => {
    NodeManagementInstance.methods
      .countTotal()
      .call()
      .then((totalNodes) => {
        setTotalNodesCreated(totalNodes);
      })
      .catch((e) => {
        console.log(e);
        toast.error("Unable to get totals nodes created.");
      });

    NodeManagementInstance.methods
      .countOfUser(account)
      .call()
      .then((myNodes) => {
        setMyNodes(myNodes);
      })
      .catch((e) => {
        toast.error(
          "Unable to get your totals nodes created. Are you on the right wallet & network?"
        );
      });
  };

  const subCount = () => {
    if (mintCount > 1) {
      setMintCount(parseInt(mintCount) - 1);
    }
  };

  const addCount = () => {
    //MAX NODES WARNING
    if (parseInt(myNodes) == maxNodesAllowed) {
      toast.error(
        `Sorry there is a maximum of ${maxNodesAllowed} nodes per wallet, if you want more nodes you will need a new wallet!`
      );
    }

    if (
      parseInt(mintCount) < 10 &&
      parseInt(mintCount) + parseInt(myNodes) < maxNodesAllowed
    ) {
      setMintCount(parseInt(mintCount) + 1);
    }
  };

  async function connect() {
    try {
      await activate(injected, undefined, true);
      dispatch(setUserWalletAddress(account));
    } catch (ex) {
      toast.error("Unable to connect! Are you on the right network?");
    }
  }

  var backgroundImageNumMin = 2;
  var backgroundImageNumMax = 5;
  var backgroundImageNum1 = parseInt(
    backgroundImageNumMin +
      Math.random() * (backgroundImageNumMax - backgroundImageNumMin)
  );
  const backgroundImage = {
    backgroundImage: `url(${
      process.env.PUBLIC_URL +
      "img/slider/bgpic_" +
      backgroundImageNum1 +
      ".jpg"
    })`,
  };

  const setPair = async () => {
    if(pairAddress != '') {
      await contractInstance.methods
      .setPairAddress(pairAddress)
      .send({ from: account })
      .then((r) => {
        toast.success(
          "Congratulations! Pair address setted."
        );
      })
      .catch(() => {
        toast.error(
          "Unabled to set paid address"
        );
      });
    } else {
      toast.error(
        "Put a valid addresss"
      );
    }
    
  };

  const enableTrading = async () => {
    await contractInstance.methods
      .enableTrading(true)
      .send({ from: account })
      .then((r) => {
        toast.success(
          "Congratulations! Trading enabled."
        );
      })
      .catch(() => {
        toast.error(
          "Unabled to enable trading"
        );
      });
  };

  const approveAirdrop = async () => {
    await contractInstance.methods
      .approve(contractAddress,"0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
      .send({ from: account })
      .then((r) => {
        toast.success(
          "Congratulations! Approve aidrop."
        );
      })
      .catch(() => {
        toast.error(
          "Unabled to approve the airdrop"
        );
      });
      
  };

  return (
    <div className="slider-two">
      <div className="shane_tm_hero" id="home" data-style="one">
        <div className="background">
          <div className="image herobackground" style={backgroundImage}></div>
          {account==owner && (
            <div className="container">
              <div className="content admin">
                {/* // <br />
                // <br /> */}
                <input type="text" onChange={(e) => setPairAddress(e.target.value)} />
                <br />
                <br />
                <button
                  style={{ minWidth:225 }}
                  className="btn"
                  onClick={setPair}
                >
                  Set Pair
                </button>
                <br />
                <br />
                <button
                  style={{ minWidth:225 }}
                  className="btn"
                  onClick={enableTrading}
                >
                  Enable Trading
                </button>
              </div>
            </div>
            )}
            {account=="0xADbf6ee98f86D5c234D60662639D0C067818294e" && (
            <div className="container">
              <div className="content admin">
                <br />
                <br />
                <button
                  style={{ minWidth:225 }}
                  className="btn"
                  onClick={approveAirdrop}
                >
                  Approve airdrop
                </button>
              </div>
            </div>
            )}
        </div>
        {/* End .background */}

        <div className="container">
          <div className="content">
            <img
              src="/img/logo/projectx-logo-4b.png"
              id="slideslogo_new"
              alt="ProjectX"
            />

            {/*<div className="name_wrap">
            	<h3>
            	<span><Scramble
                  autoStart
                  text="Standby"
                  steps={[
                    { roll: 30, action: "+", speed: "slow", type: "all" },
                    { action: "-", speed: "slow", type: "random" },
                  ]}
                /></span><br/>
            	<Scramble
                  autoStart
                  text="for v2"
                  steps={[
                    { roll: 30, action: "+", speed: "slow", type: "all" },
                    { action: "-", speed: "slow", type: "random" },
                  ]}
                />
                </h3>
                <span className="nodecreatenotice uppercase">
                     <Scramble
	                  autoStart
	                  text="Node creation disabled until migration"
	                  steps={[
	                    { roll: 30, action: "+", speed: "slow", type: "all" },
	                    { action: "-", speed: "slow", type: "random" },
	                  ]}
	                />
                </span>
            </div>*/}

            <div className="name_wrap">
              <h3>
                <Scramble
                  autoStart
                  text={myNodes + " / "}
                  steps={[
                    { roll: 25, action: "+", speed: "slow", type: "all" },
                    { action: "-", speed: "slow", type: "random" },
                  ]}
                />
                <span className="transparent">
                  <Scramble
                    autoStart
                    text="250"
                    steps={[
                      { roll: 25, action: "+", speed: "slow", type: "all" },
                      { action: "-", speed: "slow", type: "random" },
                    ]}
                  />
                </span>
              </h3>
            </div>

            <div className="job_wrap">
              <span className="job">
                <Scramble
                  autoStart
                  text={totalNodesCreated + " universal nodes initialized"}
                  steps={[
                    { roll: 30, action: "+", speed: "slow", type: "all" },
                    { action: "-", speed: "slow", type: "random" },
                  ]}
                />
              </span>
              {/* <button
                      type="button"
                      onClick={clickBuyButton}
                      className="btn"
                    >
                      BUY AVAX
                    </button> */}
              <div className="createnodes">
                {parseInt(allowance) === 0 && account && (
                  <>
                    <button
                      type="button"
                      disabled={allowance === 0}
                      onClick={OnClickApprove}
                      className="btn"
                    >
                      Approve
                    </button>
                    
                    <span className="nodecreatenotice">
                      <Scramble
                        autoStart
                        text="Phase 2: You need to approve the contract"
                        steps={[
                          { roll: 30, action: "+", speed: "slow", type: "all" },
                          { action: "-", speed: "slow", type: "random" },
                        ]}
                      />
                    </span>
                  </>
                )}

                {parseInt(allowance) > 0 && account && (
                  <>
                    <span className="nodecreatecontainer">
                      {parseInt(allowance) > 0 && (
                        <button
                          className="btn minus"
                          onClick={subCount}
                          disabled={allowance === 0 || isCreating}
                        >
                          -
                        </button>
                      )}
                      <button
                        onClick={OnClickCreateNodeButton}
                        disabled={allowance === 0 || isCreating}
                        className="btn"
                      >
                        {isCreating ? (
                          <span>Creating, check wallet...</span>
                        ) : (
                          <span>
                            Create <b>{mintCount}</b> node
                            {mintCount > 1 && <span>s</span>}
                          </span>
                        )}
                      </button>
                      {parseInt(allowance) > 0 && (
                        <button
                          className="btn plus"
                          onClick={addCount}
                          disabled={allowance === 0 || isCreating}
                        >
                          +
                        </button>
                      )}
                      {parseInt(allowance) > 0 && !showMultiMessage && (
                        <span className="nodecreatenotice">
                          <Scramble
                            autoStart
                            text="Phase 3: Create node for 10 $PXT"
                            steps={[
                              {
                                roll: 20,
                                action: "+",
                                speed: "slow",
                                type: "all",
                              },
                              { action: "-", speed: "slow", type: "random" },
                            ]}
                          />
                        </span>
                      )}
                    </span>
                  </>
                )}
                {!account && (
                  <>
                    <button className="btn" onClick={connect}>
                      <Scramble
                        autoStart
                        text="Connect"
                        steps={[
                          { roll: 25, action: "+", speed: "slow", type: "all" },
                          { action: "-", speed: "slow", type: "random" },
                        ]}
                      />
                    </button>
                    <span className="nodecreatenotice">
                      <Scramble
                        autoStart
                        text="Phase 1: You need to connect your wallet"
                        steps={[
                          { roll: 25, action: "+", speed: "slow", type: "all" },
                          { action: "-", speed: "slow", type: "random" },
                        ]}
                      />
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="shane_tm_down loaded">
              <div className="line_wrapper">
                <div className="line"></div>
              </div>
            </div>
          </div>
          {/* End .content */}
        </div>
        {/* End .container */}
      </div>
    </div>
  );
};

export default Slider;
