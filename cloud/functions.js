Parse.Cloud.define("createUser", async (request) => {
    const { username, name, email, balance, password } = request.params;

    if (!username || !email || !password) {
        throw new Parse.Error(
            400,
            "Missing required fields: username, email, or password"
        );
    }

    try {
        // Create a new Parse User
        const user = new Parse.User();
        user.set("username", username);
        user.set("name", name);
        user.set("email", email);
        user.set("balance", balance);
        user.set("password", password);

        // Save the user
        await user.signUp(null, { useMasterKey: true });

        return { success: true, message: "User created successfully!" };
    } catch (error) {
        // Handle different error types
        if (error instanceof Parse.Error) {
            // Return the error if it's a Parse-specific error
            return {
                status: "error",
                code: error.code,
                message: error.message,
            };
        } else {
            // Handle any unexpected errors
            return {
                status: "error",
                code: 500,
                message: "An unexpected error occurred.",
            };
        }
    }
});

Parse.Cloud.define("updateUser", async (request) => {
    const { userId, username, name, email, balance } = request.params;

    try {
        // Find the user by ID
        const userQuery = new Parse.Query(Parse.User);
        userQuery.equalTo("objectId", userId);
        const user = await userQuery.first({ useMasterKey: true });

        if (!user) {
            throw new Parse.Error(404, `User with ID ${userId} not found`);
        }

        // Update the user fields
        user.set("username", username);
        user.set("name", name);
        user.set("email", email);
        user.set("balance", parseFloat(balance));

        // Save the user
        await user.save(null, { useMasterKey: true });

        return { success: true, message: "User updated successfully" };
    } catch (error) {
        // Handle different error types
        if (error instanceof Parse.Error) {
            // Return the error if it's a Parse-specific error
            return {
                status: "error",
                code: error.code,
                message: error.message,
            };
        } else {
            // Handle any unexpected errors
            return {
                status: "error",
                code: 500,
                message: "An unexpected error occurred.",
            };
        }
    }
});

Parse.Cloud.define("deleteUser", async (request) => {
    const { userId } = request.params;

    if (!userId) {
        throw new Error("User ID is required to delete the user.");
    }

    try {
        // Query the user
        const query = new Parse.Query(Parse.User);
        query.equalTo("objectId", userId);
        const user = await query.first({ useMasterKey: true });

        if (!user) {
            throw new Error("User not found.");
        }

        // Delete the user
        await user.destroy({ useMasterKey: true });

        // Fetch remaining users
        const remainingUsersQuery = new Parse.Query(Parse.User);
        const remainingUsers = await remainingUsersQuery.find({
            useMasterKey: true,
        });

        return {
            success: true,
            message: `User with ID ${userId} has been deleted.`,
            data: remainingUsers.map((user) => ({
                id: user.id,
                username: user.get("username"),
                email: user.get("email"),
                name: user.get("name"),
                balance: user.get("balance"),
            })),
        };
    } catch (error) {
        throw new Error(`Failed to delete user: ${error.message}`);
    }
});

Parse.Cloud.define("getUserById", async (request) => {
    const { userId } = request.params;

    if (!userId) {
        throw new Parse.Error(400, "Missing required parameter: userId");
    }

    try {
        const query = new Parse.Query(Parse.User);
        query.select("username", "email", "name", "balance");
        query.equalTo("objectId", userId);

        const user = await query.first({ useMasterKey: true });

        if (!user) {
            throw new Parse.Error(404, `User with ID ${userId} not found`);
        }

        // Return user data
        return {
            id: user.id,
            username: user.get("username"),
            email: user.get("email"),
            name: user.get("name"),
            balance: user.get("balance"),
        };
    } catch (error) {
        // Handle different error types
        if (error instanceof Parse.Error) {
            // Return the error if it's a Parse-specific error
            return {
                status: "error",
                code: error.code,
                message: error.message,
            };
        } else {
            // Handle any unexpected errors
            return {
                status: "error",
                code: 500,
                message: "An unexpected error occurred.",
            };
        }
    }
});

Parse.Cloud.define("fetchAllUsers", async (request) => {
    try {
        const userQuery = new Parse.Query(Parse.User);
        userQuery.select("username", "name", "email", "lastLoginIp", "balance");
        const allUsers = await userQuery.find({ useMasterKey: true });
        return allUsers.map((user) => ({
            id: user.id,
            username: user.get("username"),
            name: user.get("name"),
            email: user.get("email"),
            lastLoginIp: user.get("lastLoginIp"),
            balance: user.get("balance"),
        }));
    } catch (error) {
        // Handle different error types
        if (error instanceof Parse.Error) {
            // Return the error if it's a Parse-specific error
            return {
                status: "error",
                code: error.code,
                message: error.message,
            };
        } else {
            // Handle any unexpected errors
            return {
                status: "error",
                code: 500,
                message: "An unexpected error occurred.",
            };
        }
    }
});

Parse.Cloud.define("userTransaction", async (request) => {
    const axios = require("axios");

    const { id, type, username, balance, transactionAmount, remark } =
        request.params;

    try {
        // Find the user by ID
        const userQuery = new Parse.Query(Parse.User);
        userQuery.equalTo("objectId", id);
        const user = await userQuery.first({ useMasterKey: true });

        if (!user) {
            throw new Parse.Error(404, `User with ID ${id} not found`);
        }

        let finalAmount;

        if (type === "redeem") {
            // Amount deduct form user balance
            finalAmount = balance - parseFloat(transactionAmount);
        }
        if (type === "recharge") {
            // Amount credit form user balance
            finalAmount = balance + parseFloat(transactionAmount);
        }

        // set the user field
        // user.set("balance", finalAmount);

        // set the transaction field
        const TransactionDetails = Parse.Object.extend("TransactionRecords");
        const transactionDetails = new TransactionDetails();

        transactionDetails.set("type", type);
        transactionDetails.set("gameId", "786");
        transactionDetails.set("username", username);
        transactionDetails.set("userId", id);
        // transactionDetails.set("transactionDate", new Date());
        // transactionDetails.set("beforeTransaction", balance);
        // transactionDetails.set("afterTransaction", finalAmount);
        transactionDetails.set("transactionAmount", parseFloat(transactionAmount));
        transactionDetails.set("remark", remark);

        // Save the transaction
        await transactionDetails.save(null, { useMasterKey: true });
        const transactionId = transactionDetails.id;

        console.log("@@@ transaction id @@@", transactionId);

        // Axios call to an external API
        const externalApiUrl =
            "https://aogglobal.org/AOGCRPT/controllers/api/DepositTransaction.php";
        const apiRequestBody = {
            playerId: id,
            orderId: transactionId,
            amt: parseFloat(transactionAmount),
        };

        try {
            const axiosResponse = await axios.post(externalApiUrl, apiRequestBody, {
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (axiosResponse.data.success) {
                // Server responded with an success
                console.log("*** Axios Success ***", axiosResponse.data);
                console.log("*** set 1 ***");

                // Update status to 1 on Axios success
                transactionDetails.set("status", 1);
                transactionDetails.set("referralLink", axiosResponse.data.redirect_url);
                transactionDetails.set("transactionId", axiosResponse.data.transaction_id);
                await transactionDetails.save(null, { useMasterKey: true });

                return {
                    success: true,
                    message: "Transaction updated and validated successfully",
                    apiResponse: axiosResponse.data,
                };
            }
        } catch (axiosError) {
            // Server responded with an error
            console.error("### Axios Error ###", axiosError.response.data);
            console.error("### set 0 ###");

            // Update status to 0 on Axios fail
            transactionDetails.set("status", 0);
            await transactionDetails.save(null, { useMasterKey: true });

            return {
                success: false,
                message: axiosError.response.data.message,
            };
        }

        return { success: true, message: "Transaction updated successfully" };
    } catch (error) {
        // Handle different error types
        if (error instanceof Parse.Error) {
            // Return the error if it's a Parse-specific error
            return {
                status: "error",
                code: error.code,
                message: error.message,
            };
        } else {
            // Handle any unexpected errors
            return {
                status: "error",
                code: 500,
                message: "An unexpected error occurred.",
            };
        }
    }
});

Parse.Cloud.define("checkTransactionStatus", async (request) => {
    const axios = require("axios");

    try {
        const query = new Parse.Query("TransactionRecords");

        // Step: 1 Filter by status=1
        query.equalTo("status", 1);

        const results = await query.find();

        // Step 2: Map results to JSON for readability
        const data = results.map((record) => record.toJSON());

        console.log("%%%%%%%%%", data);

        // Step 3: Iterate over the mapped data
        for (const record of data) {
            // Step 4: Prepare the request body for the API
            const params = {
                playerId: record.userId,
                orderId: record.objectId,
                transactionId: record.transactionId,
            };

            // console.log("==============", requestBody);

            // Step 5: Call the external API
            try {
                const response = await axios.get(
                    "https://aogglobal.org/AOGCRPT/controllers/api/GetTransaction.php",
                    { params }
                );
                console.log(
                    `API response for playerId ${record.userId}:`,
                    response.data
                );

                // Step 6: Update the record's status if API call succeeds
                if (response.data && response.data.success) {
                    // Adjust this according to your API's response
                    // Find the corresponding record from Parse
                    const recordObject = results.find(
                        (rec) => rec.id === record.objectId
                    );

                    console.log();

                    if (recordObject) {
                        // Step 7: Update the Transaction status to 2
                        // recordObject.set("status", 2);
                        // await recordObject.save();

                        // Step 8: Find the corresponding User record
                        const userQuery = new Parse.Query("User");
                        userQuery.equalTo("objectId", record.userId);
                        const user = await userQuery.first({ useMasterKey: true });

                        if (user) {
                            console.log("&&&", user);

                            // Step 9: Update the user's balance
                            const currentBalance = user.get("balance")
                            console.log("888888", currentBalance);
                            // const updatedBalance = currentBalance + record.transactionAmount

                            // const newBalance = user.get("balance") + record.transactionAmount;
                            // user.set("balance", updatedBalance);

                            // Save the updated user record
                            // await user.save(null, { useMasterKey: true });
                            console.log(`User balance updated successfully for playerId: ${record.userId}`);
                        } else {
                            console.error(`User not found for playerId: ${record.userId}`);
                        }

                        // need to add user balce when status 2 success
                        console.log(
                            `Transaction updated successfully for playerId: ${record.playerId}`
                        );
                        // return {
                        //     success: true,
                        //     message: "Transaction Status updated successfully.",
                        //     apiResponse: recordObject.data,
                        // };
                    } else {
                        console.error(`Record not found for playerId: ${record.playerId}`);
                    }
                } else {
                    console.error(
                        `API call failed for playerId ${record.playerId}:`,
                        response.data
                    );
                }
            } catch (error) {
                console.error(
                    `Error updating transaction for playerId ${record.userId}:`,
                    error.message
                );
                return {
                    success: false,
                    message: error.message,
                };
            }
        }

        // // Return a summary of the operation
        // return {
        //     message: `Successfully updated ${successfulUpdates} transactions.`,
        //     total: data.length,
        //     successfulUpdates,
        // };
    } catch (error) {
        // Handle different error types
        if (error instanceof Parse.Error) {
            // Return the error if it's a Parse-specific error
            return {
                status: "error",
                code: error.code,
                message: error.message,
            };
        } else {
            // Handle any unexpected errors
            return {
                status: "error",
                code: 500,
                message: "An unexpected error occurred.",
            };
        }
    }
});

Parse.Cloud.define("redeemRedords", async (request) => {
    const axios = require("axios");

    const { id, type, username, balance, transactionAmount, remark } =
        request.params;


    try {
        console.log("99999999999", request.params);
        let body = JSON.stringify({
            playerId: id,
            amt: parseFloat(transactionAmount)
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://aogglobal.org/AOGCRPT/controllers/api/WithdrawTransaction.php',
            headers: {
                'Content-Type': 'application/json'
            },
            data: body
        };

        // Make the API call using Axios
        const response = await axios.request(config);

        console.log("^^^", response);

        if (response?.data.success) {
            // set the transaction field
            const TransactionDetails = Parse.Object.extend("TransactionRecords");
            const transactionDetails = new TransactionDetails();

            transactionDetails.set("type", type);
            transactionDetails.set("gameId", "786");
            transactionDetails.set("username", username);
            transactionDetails.set("userId", id);
            // transactionDetails.set("transactionDate", new Date());
            // transactionDetails.set("beforeTransaction", balance);
            // transactionDetails.set("afterTransaction", finalAmount);
            transactionDetails.set("transactionAmount", parseFloat(transactionAmount));
            transactionDetails.set("remark", remark);
            transactionDetails.set("status", 2);
            // Save the transaction
            await transactionDetails.save(null, { useMasterKey: true });

            // You can process the response here and return a response if needed
            return {
                status: "success",
                message: "Redeem successful",
                data: response.data
            };
        } else {
            return {
                status: "error",
                message: response.data.message
            };
        }



    } catch (error) {
        // Handle different error types
        if (error.response) {
            return {
                status: "error",
                code: error.response.status,
                message: error.response.data.message
            };
        } if (error instanceof Parse.Error) {
            // Return the error if it's a Parse-specific error
            return {
                status: "error",
                code: error.code,
                message: error.message,
            };
        } else {
            // Handle any unexpected errors
            return {
                status: "error",
                code: 500,
                message: "An unexpected error occurred.",
            };
        }
    }
});


Parse.Cloud.define("coinsCredit", async (request) => {
    const { transactionId } = request.params;

    try {
        // Create a query to find the Transaction record by transactionId
        const TransactionRecords = Parse.Object.extend("TransactionRecords");
        const query = new Parse.Query(TransactionRecords);
        query.equalTo("objectId", transactionId);

        // Fetch the record
        const transaction = await query.first();

        if (!transaction) {
            throw new Error("Transaction not found");
        }

        // Set the status to "Coins Credited" (status: 3)
        transaction.set("status", 3);

        // Save the updated record
        await transaction.save();

        return { success: true, message: "Status updated to Coins Credited" };
    } catch (error) {
        // Handle different error types
        if (error instanceof Parse.Error) {
            // Return the error if it's a Parse-specific error
            return {
                status: "error",
                code: error.code,
                message: error.message,
            };
        } else {
            // Handle any unexpected errors
            return {
                status: "error",
                code: 500,
                message: "An unexpected error occurred.",
            };
        }
    }
});

Parse.Cloud.beforeSave("Test", () => {
    throw new Parse.Error(9001, "Saving test objects is not available.");
});
