from unittest.mock import MagicMock, patch

from app.providers.ollama import OllamaProvider, _inject_images
from app.providers.openai_compat import OpenAICompatProvider, _build_messages


def test_inject_images_attaches_to_user():
    msgs = [{"role": "system", "content": "sys"}, {"role": "user", "content": "hi"}]
    images = [b"img_bytes"]
    result = _inject_images(msgs, images)
    assert result[1]["images"] == images
    assert "images" not in result[0]


def test_inject_images_no_mutation():
    msgs = [{"role": "user", "content": "hi"}]
    _inject_images(msgs, [b"x"])
    assert "images" not in msgs[0]


def test_build_messages_no_images():
    msgs = [{"role": "user", "content": "hi"}]
    result = _build_messages(msgs, None)
    assert result == msgs


def test_build_messages_with_images():
    msgs = [{"role": "user", "content": "describe this"}]
    result = _build_messages(msgs, [b"\x89PNG"])
    assert isinstance(result[0]["content"], list)
    assert result[0]["content"][0]["type"] == "text"
    assert result[0]["content"][1]["type"] == "image_url"


def test_ollama_provider_chat():
    with patch("app.providers.ollama.ollama.Client") as MockClient:
        mock_client = MockClient.return_value
        mock_client.chat.return_value = {"message": {"content": "  vuln description  "}}

        provider = OllamaProvider()
        result = provider.chat([{"role": "user", "content": "test"}])

        assert result == "vuln description"
        mock_client.chat.assert_called_once()


def test_ollama_provider_stream():
    chunks = [{"message": {"content": "tok1"}}, {"message": {"content": "tok2"}}]
    with patch("app.providers.ollama.ollama.Client") as MockClient:
        mock_client = MockClient.return_value
        mock_client.chat.return_value = iter(chunks)

        provider = OllamaProvider()
        result = list(provider.stream([{"role": "user", "content": "test"}]))

        assert result == ["tok1", "tok2"]


def test_openai_compat_provider_chat():
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "openai response"

    with patch("app.providers.openai_compat.OpenAI") as MockOpenAI:
        mock_client = MockOpenAI.return_value
        mock_client.chat.completions.create.return_value = mock_response

        provider = OpenAICompatProvider()
        result = provider.chat([{"role": "user", "content": "test"}])

        assert result == "openai response"
