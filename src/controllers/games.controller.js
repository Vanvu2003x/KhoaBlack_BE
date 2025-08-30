const { getListGame, addGame, deleteGame, updateGame, getGamesByTopupType, getGameByGameCode } = require("../models/games.model");

async function getAllGames(req, res) {
    try {
        const result = await getListGame();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server khi lấy danh sách game" });
    }
}
async function UpdateGameController(req, res) {
    try {
        const infoRaw = req.body.info;
        if (!infoRaw) {
            return res.status(400).json({ message: "Thiếu thông tin game" });
        }

        let gameInfo;
        try {
            gameInfo = JSON.parse(infoRaw);
        } catch {
            return res.status(400).json({ message: "Thông tin game không hợp lệ (không phải JSON)" });
        }

        const id = req.query.id;

        const dataGame = {
            name: gameInfo.name,
            sever: gameInfo.sever,
            gamecode: gameInfo.gamecode,
            publisher: gameInfo.publisher,
        };

        if (req.file) {
            dataGame.thumbnail = `/uploads/${req.file.filename}`;
        }

        let result;
        try {
            result = await updateGame(id, dataGame);
        } catch (err) {
            return res.status(500).json({ message: "Lỗi khi cập nhật dữ liệu game trong cơ sở dữ liệu" });
        }

        if (result) {
            return res.status(200).json({ message: "Cập nhật game thành công", data: result });
        } else {
            return res.status(404).json({ message: "Không tìm thấy game để cập nhật" });
        }
    } catch (error) {
        console.error("❌ Lỗi server khi xử lý update:", error);
        res.status(500).json({ message: "Lỗi server khi cập nhật game" });
    }
}

async function CreateGame(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Thiếu ảnh" });
        }
        const infoRaw = req.body.info;
        if (!infoRaw) {
            return res.status(400).json({ message: "Thiếu thông tin game" });
        }

        let gameInfo;
        try {
            gameInfo = JSON.parse(infoRaw);
        } catch {
            return res
                .status(400)
                .json({ message: "Thông tin game không hợp lệ (không phải JSON)" });
        }

        const dataGame = {
            name: gameInfo.name,
            thumbnail: `/uploads/${req.file.filename}`,
            sever: gameInfo.sever,
            gamecode: gameInfo.gamecode,
            publisher: gameInfo.publisher,
        };

        const result = await addGame(dataGame);
        if (result) {
            return res
                .status(201)
                .json({ message: "Tạo game thành công", data: result });
        } else {
            return res.status(400).json({ message: "Không thể tạo game" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server khi tạo game" });
    }
}

async function DeleteGameController(req, res) {
    try {
        const id = req.query.id;

        if (!id) {
            return res.status(400).json({ message: "Thiếu id" });
        }

        const result = await deleteGame(id);

        return res.status(200).json({
            message: "Xóa game thành công",
            data: result,
        });
    } catch (error) {
        console.error("Lỗi khi xóa game:", error);
        return res
            .status(500)
            .json({ message: "Lỗi server", error: error.message });
    }
}

async function getGamesByTypeController(req, res) {
    try {
        const { type } = req.query;

        if (!type) {
            return res.status(400).json({ message: "Thiếu tham số kiểu nạp (type)" });
        }

        const result = await getGamesByTopupType(type);

        res.status(200).json(result);
    } catch (error) {
        console.error("Lỗi khi lấy game theo kiểu nạp:", error);
        res.status(500).json({ message: "Lỗi server khi lọc game theo kiểu nạp" });
    }
}

const getGameByGameCodeController = async (req, res) => {
  try {
    const { gamecode } = req.params;

    if (!gamecode) {
      return res.status(400).json({ message: "Thiếu gamecode trong URL" });
    }

    const game = await getGameByGameCode(gamecode);

    if (!game) {
      return res.status(404).json({ message: "Không tìm thấy game với gamecode này" });
    }

    return res.status(200).json(game);
  } catch (error) {
    console.error("Lỗi khi lấy game:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};
module.exports = {
    getAllGames,
    CreateGame,
    DeleteGameController,
    UpdateGameController, 
    getGamesByTypeController,
    getGameByGameCodeController
};
